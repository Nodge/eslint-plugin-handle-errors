"""Engine of a runbook run: state in state.json, a text log in progress.md, next actions on stdout.

A runbook's flow.py declares inputs, executors and steps with this module and ends with rb.main().
The orchestrator then talks to flow.py:

    flow.py <run> start '<given inputs as JSON>'   new run: creates the directory, prints what to launch
    flow.py <run> reply <section> '<reply JSON>'   a step finished: records the reply, prints what follows
    flow.py <run> answer <section> '<choice>'      the human answered a human step
    flow.py <run> interrupted <section>            a running step's executor is gone: relaunch it
    flow.py <run> relaunch <section>               the human said yes to relaunching a failed side-effect step
    flow.py <run> log '<text>'                     add a line to progress.md
    flow.py <run>                                  nothing new: print what is pending
    flow.py --check                                validate the declarations

A JSON argument may be `-` to read it from stdin, for text with quotes in it.

Source: https://github.com/Nodge/skills/tree/main/skills/agent-runbook-authoring
Each release is tagged agent-runbook-authoring/v<__version__>. Changes to the flow.py API: CHANGELOG.md there.
"""
from __future__ import annotations

__version__ = '1.1.0'

import json
import os
import re
import sys
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from types import SimpleNamespace
from typing import Any, NoReturn, TypeAlias


# ---------- targets ----------

@dataclass(frozen=True)
class End:
    """A target that ends the run with this status; report is what the human is told to read."""

    status: str
    report: str = ''


@dataclass(frozen=True)
class Parallel:
    """A target that launches several steps at once."""

    steps: tuple[str, ...]


# How a failed or blocked step without on_failure, or a failed join, ends the run.
FAILED_END = End('failed', 'read <run>/progress.md')


def end(status: str, report: str = '') -> End:
    """The run ends with this status. report: what the human reads next, printed at the end."""
    return End(status, report)


def parallel(*steps: str) -> Parallel:
    """Launch these steps together. They write different files, and at most one changes the tree."""
    return Parallel(steps)


Target: TypeAlias = 'str | End | Parallel | None'
Route: TypeAlias = 'Target | Callable[..., Target]'


def _resolve(route: Any, *args: Any) -> Any:
    return route(*args) if callable(route) else route


def die(msg: str) -> NoReturn:
    """Print an error for the orchestrator and exit with status 2."""
    print(f'flow.py: {msg}', file=sys.stderr)
    sys.exit(2)


# ---------- declarations ----------

@dataclass
class Step:
    """A step an executor runs. Fields mirror the parameters of Runbook.step."""

    name: str
    executor: str | Callable[[State], str]
    prompt: str
    next: Route
    inputs: list[str | tuple[str, Any]] = field(default_factory=list)
    reply: dict[str, type] = field(default_factory=dict)
    reads: list[str] = field(default_factory=list)
    writes: list[str] = field(default_factory=list)
    after: list[str] = field(default_factory=list)
    side_effects: str | None = None
    on_failure: Route = None
    skip: Callable[[State], Target] | None = None


@dataclass
class HumanStep:
    """A question to the human. Fields mirror the parameters of Runbook.human."""

    name: str
    question: str
    next: Route
    choices: list[str] = field(default_factory=list)
    writes: str | None = None
    after: list[str] = field(default_factory=list)

    def match(self, answer: str) -> str | None:
        """The declared choice this answer names, or the answer itself when the step takes free text."""
        if not self.choices:
            return answer
        for choice in self.choices:
            if choice.lower() == answer.strip().lower():
                return choice
        return None


AnyStep: TypeAlias = 'Step | HumanStep'
WORKING_TREE = 'working tree'


def _writes(step: AnyStep) -> list[str]:
    if isinstance(step, HumanStep):
        return [step.writes] if step.writes else []
    return step.writes


class State:
    """What a `next` or `skip` function may ask about the run: `s.inputs.<name>`, `s.done(step)`, `s.reply(step)`."""

    def __init__(self, inputs: dict[str, Any], done_count: dict[str, int],
                 latest: dict[str, Section] | None = None) -> None:
        self.inputs = SimpleNamespace(**inputs)
        self._done = done_count
        self._latest = latest or {}

    def done(self, step: str) -> int:
        """How many sections of this step are done so far, the one just recorded included."""
        return self._done.get(step, 0)

    def reply(self, step: str) -> SimpleNamespace | None:
        """The reply of this step's latest section reached so far, if that section is done."""
        section = self._latest.get(step)
        if section is None or section.status is not Status.DONE:
            return None
        return SimpleNamespace(**(section.reply or {}))


# ---------- run state ----------

class Status(Enum):
    """Status of a section in state.json."""

    RUNNING = 'running'
    WAITING_FOR_HUMAN = 'waiting_for_human'
    DONE = 'done'
    FAILED = 'failed'
    BLOCKED = 'blocked'

    @property
    def is_open(self) -> bool:
        return self in (Status.RUNNING, Status.WAITING_FOR_HUMAN)


REPLY_STATUSES = (Status.DONE.value, Status.FAILED.value, Status.BLOCKED.value)
NOTE_INTERRUPTED = 'interrupted'
NOTE_RELAUNCHED = "relaunched on the human's yes"
SUPERSEDED_NOTES = ('interrupted', 'relaunched')
INVALID_REPLY = {'status': Status.FAILED.value, 'reason': 'invalid reply'}


def utc_now() -> str:
    """The current time as state.json records it: UTC, ISO 8601 to the second, `Z` suffix."""
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


@dataclass
class Section:
    """One launch of a step: its id is the step's name, with a counter from the second launch on (fix, fix-2).

    executor, started_at and ended_at are None in a state.json written before 1.1.0; executor is None for a human step.
    """

    id: str
    name: str
    status: Status
    reply: dict[str, Any] | None = None
    note: str | None = None
    answer: str | None = None
    executor: str | None = None
    started_at: str | None = None
    ended_at: str | None = None

    @property
    def superseded(self) -> bool:
        """Interrupted or relaunched: replay skips it, and the step launches again."""
        return (self.note or '').startswith(SUPERSEDED_NOTES)

    @property
    def reason(self) -> str:
        return (self.reply or {}).get('reason', '')

    def label(self) -> str:
        return self.id

    def close(self, status: Status) -> None:
        """Moves the section to status, stamping ended_at if it leaves an open status."""
        if self.status.is_open and not status.is_open:
            self.ended_at = utc_now()
        self.status = status

    def to_json(self) -> dict[str, Any]:
        return dict(id=self.id, name=self.name, status=self.status.value, reply=self.reply, note=self.note,
                    answer=self.answer, executor=self.executor, started_at=self.started_at, ended_at=self.ended_at)

    @classmethod
    def from_json(cls, data: dict[str, Any]) -> Section:
        return cls(id=data['id'], name=data['name'], status=Status(data['status']), reply=data['reply'],
                   note=data['note'], answer=data.get('answer'), executor=data.get('executor'),
                   started_at=data.get('started_at'), ended_at=data.get('ended_at'))


@dataclass
class RunState:
    """The contents of <run>/state.json. status is 'running', 'waiting_for_human' or the end status."""

    runbook: str
    status: str
    inputs: dict[str, Any]
    sections: list[Section]

    @staticmethod
    def path(run_dir: str) -> str:
        return os.path.join(run_dir, 'state.json')

    @classmethod
    def load(cls, run_dir: str) -> RunState:
        path = cls.path(run_dir)
        if not os.path.exists(path):
            die(f'{path}: not found')
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        return cls(runbook=data['runbook'], status=data['status'], inputs=data['inputs'],
                   sections=[Section.from_json(s) for s in data['sections']])

    def save(self, run_dir: str) -> None:
        data = dict(runbook=self.runbook, status=self.status, inputs=self.inputs,
                    sections=[s.to_json() for s in self.sections])
        with open(self.path(run_dir), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def section(self, sid: str) -> Section:
        for section in self.sections:
            if section.id == sid:
                return section
        die(f'no section {sid} in state.json')

    def new_section(self, name: str, status: Status, executor: str | None = None) -> Section:
        earlier = sum(1 for s in self.sections if s.name == name)
        sid = f'{name}-{earlier + 1}' if earlier else name
        section = Section(id=sid, name=name, status=status, executor=executor, started_at=utc_now())
        self.sections.append(section)
        return section


class RunFiles:
    """Step outputs in a run directory: a section writes <run>/<NN>-<name>, NN being its place among the sections."""

    def __init__(self, steps: dict[str, AnyStep], run_dir: str, state: RunState) -> None:
        self.run_dir = run_dir
        self.state = state
        self._writers: dict[str, set[str]] = {}
        for step in steps.values():
            for name in _writes(step):
                self._writers.setdefault(name, set()).add(step.name)

    def path(self, section: Section, name: str) -> str:
        return os.path.join(self.run_dir, f'{self.state.sections.index(section):02d}-{name}')

    def is_output(self, name: str) -> bool:
        return name in self._writers

    def latest(self, name: str, before: Section | None = None) -> str | None:
        """The file a done section last wrote under this name, among the sections before `before`."""
        end = self.state.sections.index(before) if before is not None else len(self.state.sections)
        found = None
        for i, section in enumerate(self.state.sections[:end]):
            if section.status is Status.DONE and section.name in self._writers.get(name, ()):
                found = os.path.join(self.run_dir, f'{i:02d}-{name}')
        return found

    def substitute(self, text: str) -> str:
        """<run>/<output name> becomes the latest file of that name; any other <run> the run directory."""
        for name in self._writers:
            latest = self.latest(name)
            if latest:
                text = text.replace(f'<run>/{name}', latest)
        return text.replace('<run>', self.run_dir)


class ProgressLog:
    """<run>/progress.md: the inputs, then one line per event. Append-only."""

    def __init__(self, run_dir: str) -> None:
        self.run_dir = run_dir
        self.path = os.path.join(run_dir, 'progress.md')

    def create(self, runbook: str, inputs: dict[str, Any]) -> None:
        values = ''.join(f'- {k}: {v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)}\n'
                         for k, v in inputs.items())
        with open(self.path, 'w', encoding='utf-8') as f:
            f.write(f'# Run {os.path.basename(self.run_dir)}\n\n'
                    f'Runbook `{runbook}`. State in `state.json`. Inputs:\n\n'
                    f'{values}\n## Log\n\n')

    def append(self, line: str) -> None:
        with open(self.path, 'a', encoding='utf-8') as f:
            f.write(f'- {line}\n')


# ---------- replay ----------

@dataclass
class Ending:
    """The run has reached an end target, or failed; why goes into the end line and the log."""

    end: End
    why: str


@dataclass
class Plan:
    """What replaying the sections leaves to do."""

    launch: list[str] = field(default_factory=list)
    waiting: list[Section] = field(default_factory=list)
    humans: list[Section] = field(default_factory=list)
    side_effect_failures: list[Section] = field(default_factory=list)
    ending: Ending | None = None
    done_count: dict[str, int] = field(default_factory=dict)

    @property
    def idle(self) -> bool:
        return not (self.launch or self.waiting or self.humans or self.side_effect_failures)


class Replay:
    """Walks the flow from the first step, matching each visit to the next recorded section of that step.

    A finished section is routed through its step's next or on_failure; a step with no section left is to be
    launched; an open section is waited for. A step with `after` waits until the latest sections of those
    steps are finished, and is visited again whenever another branch finishes. A step whose `skip` returns a
    target is not launched: the walk goes on to that target.
    """

    def __init__(self, steps: dict[str, AnyStep], start: str, state: RunState) -> None:
        self._steps = steps
        self._start = start
        self._state = state
        self._consumed: set[str] = set()
        self._latest: dict[str, Section] = {}
        self._pending_joins: set[str] = set()
        self._plan = Plan()

    def run(self) -> Plan:
        self._visit(self._start)
        if self._plan.ending:
            # A branch cut off by the ending may still have an executor at work: the run ends once it reports.
            seen = {s.id for s in self._plan.waiting}
            self._plan.waiting += [s for s in self._state.sections
                                   if s.status is Status.RUNNING and not s.superseded and s.id not in seen]
        return self._plan

    def _visit(self, name: str) -> None:
        if self._plan.ending:
            return
        if name not in self._steps:
            die(f'step {name!r} is not declared')
        step = self._steps[name]
        if not self._joined(step):
            return
        if isinstance(step, Step) and step.skip is not None:
            target = step.skip(self._state_now())
            if target is not None:
                self._go(target, f'{name} skipped')
                return
        section = self._next_section(name)
        if section is None:
            if name not in self._plan.launch:
                self._plan.launch.append(name)
            return
        self._consumed.add(section.id)
        self._latest[name] = section
        if section.status is Status.RUNNING:
            self._plan.waiting.append(section)
        elif section.status is Status.WAITING_FOR_HUMAN:
            self._plan.humans.append(section)
        elif section.status is Status.DONE:
            self._plan.done_count[name] = self._plan.done_count.get(name, 0) + 1
            self._route(step, section)
        elif isinstance(step, Step) and step.side_effects:
            self._plan.side_effect_failures.append(section)
        else:
            self._route(step, section)

    def _joined(self, step: AnyStep) -> bool:
        for dep in step.after:
            latest = self._latest.get(dep)
            if latest is None or latest.status.is_open:
                self._pending_joins.add(step.name)
                return False
            if latest.status is not Status.DONE:
                why = f'step {latest.id} {latest.status.value} before the join at {step.name}'
                self._plan.ending = Ending(FAILED_END, why)
                return False
        self._pending_joins.discard(step.name)
        return True

    def _next_section(self, name: str) -> Section | None:
        for section in self._state.sections:
            if section.name == name and section.id not in self._consumed and not section.superseded:
                return section
        return None

    def _route(self, step: AnyStep, section: Section) -> None:
        target = self._target(step, section)
        if target is None:
            why = f'step {section.id} {section.status.value}'
            if section.reason:
                why += f': {section.reason}'
            self._plan.ending = Ending(FAILED_END, why)
            return
        self._go(target, f'after step {section.id}')

    def _go(self, target: str | End | Parallel, why: str) -> None:
        if isinstance(target, End):
            self._plan.ending = Ending(target, why)
            return
        targets = target.steps if isinstance(target, Parallel) else (target,)
        for t in targets:
            self._visit(t)
        for j in sorted(self._pending_joins):
            self._visit(j)

    def _state_now(self) -> State:
        return State(self._state.inputs, self._plan.done_count, self._latest)

    def _target(self, step: AnyStep, section: Section) -> Target:
        s = self._state_now()
        if isinstance(step, HumanStep):
            return _resolve(step.next, section.note, s)
        r = SimpleNamespace(**(section.reply or {}))
        if section.status is Status.DONE:
            return _resolve(step.next, r, s)
        if step.on_failure is not None:
            return _resolve(step.on_failure, r, s)
        return None


# ---------- output ----------

# ---------- what the orchestrator and the executors read ----------

TEXT = {
    # printed for the orchestrator
    'launch': 'launch {label} with executor {executor}: {spec}',
    'launch_side_effects': '. Side effects: {side_effects}',
    'when_finishes': 'when it finishes: {command}',
    'ask': 'ask the human ({label}): {question}',
    'ask_choices': '  choices: {choices}. Map the answer to one of them; ask again if none fits.',
    'ask_free': '  free text: pass their words as they are.',
    'ask_then': '  then: {command}',
    'waiting_for_human': 'waiting for the human on {label}. {choices}. When they answer: {command}.',
    'choices': 'Choices: {choices}',
    'free_text': 'Free text',
    'side_effect_failure': 'ask the human: step {label} has side effects and ended {status}{reason}. '
                           'On yes: {relaunch}. On no: {log} and stop.',
    'still_running': 'still running: {labels}',
    'idle': 'nothing is pending and the run has not ended. Report that to the human with the run directory, and stop.',
    'wait_for_end': 'wait: {labels}. The run ends {status} once they are recorded.',
    'ended': 'end: {status} ({why}). The run is over. Report to the human: status {status}, run directory {run}{report}.',
    'reason': ' ({reason})',
    'report': ', {report}',
    # placeholders inside the commands the orchestrator fills in
    'reply_arg': "'<the last JSON object of its message>'",
    'answer_arg': "'<the choice>' '<their words verbatim, or - to read them from stdin>'",
    'answer_free_arg': "'<their words verbatim, or - to read them from stdin>'",
    'log_arg': "'<their decision>'",
    # sent to the executor, between the message markers
    'message_open': '--- message ---',
    'message_read': 'Read {common}, then {prompt}, and do what they say.',
    'message_repo': 'repo: {repo}',
    'message_run': 'run: {run}',
    'message_input': '{key}: {value}',
    'message_write': 'write {name}: {path}',
    'message_file': 'read {name}: {path}',
    'absent': 'absent, no earlier step wrote it',
    'message_partial': 'The tree may hold a partial earlier attempt.',
    'message_close': '--- end of message ---',
    'missing_repo': '<repo: not among the inputs>',
    'missing_input': '<not among the inputs>',
    'missing_executor': '<executor not declared>',
}

class Renderer:
    """Turns a plan into the lines the orchestrator reads on stdout. The wording lives in TEXT."""

    def __init__(self, rb: Runbook, run_dir: str, state: RunState) -> None:
        self.rb = rb
        self.run_dir = run_dir
        self.state = state
        self.files = RunFiles(rb.steps, run_dir, state)

    def _command(self, *args: str) -> str:
        return ' '.join((self.rb.cmd, self.run_dir) + args)

    def wait_for_end(self, ending: Ending, waiting: list[Section]) -> list[str]:
        labels = ', '.join(s.label() for s in waiting)
        return [TEXT['wait_for_end'].format(labels=labels, status=ending.end.status)]

    def ended(self, ending: Ending) -> list[str]:
        report = self.files.substitute(ending.end.report)
        return [TEXT['ended'].format(status=ending.end.status, why=ending.why, run=self.run_dir,
                                     report=TEXT['report'].format(report=report) if report else '')]

    def pending(self, plan: Plan, opened: list[Section]) -> list[str]:
        lines: list[str] = []
        for section in plan.side_effect_failures:
            lines.append(self._side_effect_failure(section))
        for section in plan.humans:
            lines.append(self._waiting_for_human(section))
        for section in opened:
            step = self.rb.steps[section.name]
            if isinstance(step, HumanStep):
                lines += self._ask(step, section)
            else:
                lines += self._launch(step, section)
        if plan.waiting:
            lines.append(TEXT['still_running'].format(labels=', '.join(s.label() for s in plan.waiting)))
        if plan.idle:
            lines.append(TEXT['idle'])
        return lines

    def _side_effect_failure(self, section: Section) -> str:
        reason = TEXT['reason'].format(reason=section.reason) if section.reason else ''
        return TEXT['side_effect_failure'].format(
            label=section.label(), status=section.status.value, reason=reason,
            relaunch=self._command('relaunch', section.id), log=self._command('log', TEXT['log_arg']))

    def _waiting_for_human(self, section: Section) -> str:
        step = self.rb.steps[section.name]
        choices = TEXT['choices'].format(choices=' | '.join(step.choices)) if step.choices else TEXT['free_text']
        return TEXT['waiting_for_human'].format(label=section.label(), choices=choices,
                                                command=self._answer_command(step, section))

    def _answer_command(self, step: HumanStep, section: Section) -> str:
        arg = TEXT['answer_arg'] if step.choices else TEXT['answer_free_arg']
        return self._command('answer', section.id, arg)

    def _ask(self, step: HumanStep, section: Section) -> list[str]:
        lines = [TEXT['ask'].format(label=section.label(), question=self.files.substitute(step.question))]
        if step.choices:
            lines.append(TEXT['ask_choices'].format(choices=' | '.join(step.choices)))
        else:
            lines.append(TEXT['ask_free'])
        lines.append(TEXT['ask_then'].format(command=self._answer_command(step, section)))
        return lines

    def _launch(self, step: Step, section: Section) -> list[str]:
        inputs = self.state.inputs
        executor = section.executor
        headline = TEXT['launch'].format(label=section.label(), executor=executor,
                                         spec=self.rb.executor_specs.get(executor, TEXT['missing_executor']))
        if step.side_effects:
            headline += TEXT['launch_side_effects'].format(side_effects=step.side_effects)
        lines = [headline, TEXT['message_open']] + self._message(step, section, inputs) + [TEXT['message_close']]
        lines.append(TEXT['when_finishes'].format(command=self._command('reply', section.id, TEXT['reply_arg'])))
        return lines

    def _message(self, step: Step, section: Section, inputs: dict[str, Any]) -> list[str]:
        lines = [TEXT['message_read'].format(common=os.path.join(self.rb.here, 'prompts', 'common.md'),
                                             prompt=os.path.join(self.rb.here, step.prompt)),
                 TEXT['message_repo'].format(repo=inputs.get('repo', TEXT['missing_repo'])),
                 TEXT['message_run'].format(run=self.run_dir)]
        for item in step.inputs:
            if isinstance(item, tuple):
                key, value = item
            else:
                key, value = item, inputs.get(item, TEXT['missing_input'])
            lines.append(TEXT['message_input'].format(key=key, value=value))
        for name in step.writes:
            lines.append(TEXT['message_write'].format(name=name, path=self.files.path(section, name)))
        for name in step.reads:
            if name == WORKING_TREE:
                continue
            path = self.files.latest(name, before=section) if self.files.is_output(name) \
                else os.path.join(self.run_dir, name)
            lines.append(TEXT['message_file'].format(name=name, path=path or TEXT['absent']))
        if any(s.name == step.name and s.superseded for s in self.state.sections):
            lines.append(TEXT['message_partial'])
        return lines


# ---------- inputs ----------

def _coerce(value: Any, typ: type) -> Any:
    """Command-line inputs arrive as strings: '2' for an int, 'true' or 'false' for a bool."""
    if isinstance(value, str):
        if typ is int and re.fullmatch(r'-?[0-9]+', value):
            return int(value)
        if typ is bool and value in ('true', 'false'):
            return value == 'true'
    return value


def _is_of_type(value: Any, typ: type) -> bool:
    return isinstance(value, typ) and not (typ is int and isinstance(value, bool))


def _resolve_inputs(spec: dict[str, Any], given: dict[str, Any]) -> dict[str, Any]:
    inputs: dict[str, Any] = {}
    problems: list[str] = []
    for name, declared in spec.items():
        required = isinstance(declared, type)
        typ = declared if required else type(declared)
        if name in given:
            value = _coerce(given[name], typ)
            if not _is_of_type(value, typ):
                problems.append(f'input {name!r} must be {typ.__name__}, got {json.dumps(value)}')
            inputs[name] = value
        elif required:
            problems.append(f'input {name!r} is required')
        else:
            inputs[name] = declared
    problems += [f'input {name!r} is not declared' for name in given if name not in spec]
    if problems:
        die('start: ' + '; '.join(problems))
    return inputs


# ---------- runbook ----------

@dataclass(frozen=True)
class Command:
    """A CLI command on a run directory: its handler and how many arguments it takes."""

    handler: Callable[[Runbook, str, list[str]], RunState]
    usage: str
    min_args: int
    max_args: int | None


class Runbook:
    """The declarations of a runbook's flow.py and the engine that runs them."""

    def __init__(self) -> None:
        self.steps: dict[str, AnyStep] = {}
        self.start_step: str | None = None
        self.input_spec: dict[str, Any] = {}
        self.executor_specs: dict[str, str] = {}
        self.here = os.path.dirname(os.path.abspath(sys.argv[0]))
        self.cmd = f'{sys.executable} {os.path.join(self.here, os.path.basename(sys.argv[0]))}'

    def inputs(self, **spec: Any) -> None:
        """Inputs of a run. A type (str, int, bool) is required; a value is a default of its type."""
        self.input_spec = spec

    def executor(self, name: str, description: str) -> None:
        """What the orchestrator launches for this executor name: model, tool, effort, cwd. Printed with every launch."""
        self.executor_specs[name] = description

    def start(self, name: str) -> None:
        """The step a run begins with."""
        self.start_step = name

    def step(self, name: str, *, executor: str | Callable[[State], str], prompt: str, next: Route,
             inputs: Any = (), reply: dict[str, type] | None = None, reads: Any = (), writes: Any = (),
             after: Any = (), side_effects: str | None = None, on_failure: Route = None,
             skip: Callable[[State], Target] | None = None) -> None:
        """A step an executor runs.

        executor: a name declared with executor(), or a function (s) -> name, to pick by inputs.
        next: a step name, parallel(...), end(...), or a function (r, s) -> one of those, where r is the
        reply with its fields as attributes and s is the State. Called for done replies only.
        on_failure: the same, called for failed and blocked replies. Without it they end the run as failed.
        inputs: names taken from the run's inputs, or (key, value) pairs passed as they are.
        reply: {field: type} the executor's JSON carries beyond status, for the reader of flow.py.
        writes: names of the files the step writes. Each launch writes <run>/<NN>-<name>, NN being its section's
        place in the run, and the launch message gives the path.
        reads: names of the files the step reads: another step's output, given as the latest such file or as
        absent; an input file under <run>, given as it is; or 'working tree', which is not passed.
        after: steps whose latest sections must be done before this one launches.
        side_effects: what the step does outside the tree; such a step is never relaunched without the human.
        skip: a function (s) -> target or None, called once `after` is satisfied. A target is followed instead
        of launching the step.
        """
        self.steps[name] = Step(name=name, executor=executor, prompt=prompt, next=next, inputs=list(inputs),
                             reply=reply or {}, reads=list(reads), writes=list(writes), after=list(after),
                             side_effects=side_effects, on_failure=on_failure, skip=skip)

    def human(self, name: str, *, question: str, next: Route, choices: Any = (),
              writes: str | None = None, after: Any = ()) -> None:
        """A question to the human.

        choices: the strings next() compares against; the orchestrator maps the answer to one of them. Without
        choices the step takes free text and next() gets it whole.
        next: a function (choice, s) -> step, parallel(...) or end(...).
        writes: a file name the engine writes the human's verbatim words to, numbered like a step's output.
        """
        self.steps[name] = HumanStep(name=name, question=question, choices=list(choices), next=next,
                                     writes=writes, after=list(after))

    # ---------- check ----------

    def check(self) -> list[str]:
        """Problems in the declarations that can be found without running the flow."""
        if not self.steps:
            return ['no steps declared']
        problems: list[str] = []
        if 'repo' not in self.input_spec:
            problems.append("inputs: 'repo' is not declared")
        if self.start_step is None:
            problems.append('no start step: call rb.start(<name>)')
        elif self.start_step not in self.steps:
            problems.append(f'start step {self.start_step!r} is not declared')
        for name, step in self.steps.items():
            problems += [f'step {name}: after({d!r}) is not declared' for d in step.after if d not in self.steps]
            if isinstance(step, HumanStep):
                problems += self._check_human(step)
            else:
                problems += self._check_step(step)
        if not os.path.exists(os.path.join(self.here, 'prompts', 'common.md')):
            problems.append('prompts/common.md does not exist')
        return problems

    def _check_human(self, step: HumanStep) -> list[str]:
        problems = []
        if not step.question:
            problems.append(f'step {step.name}: human step without a question')
        return problems

    def _check_step(self, step: Step) -> list[str]:
        n = step.name
        problems = []
        if not os.path.exists(os.path.join(self.here, step.prompt)):
            problems.append(f'step {n}: {step.prompt} does not exist')
        if isinstance(step.executor, str) and step.executor not in self.executor_specs:
            problems.append(f'step {n}: executor {step.executor!r} is not declared')
        for item in step.inputs:
            if isinstance(item, str) and item not in self.input_spec:
                problems.append(f'step {n}: input {item!r} is not a declared run input')
            elif not isinstance(item, (str, tuple)):
                problems.append(f'step {n}: input {item!r} is neither a name nor a (key, value) pair')
        if step.skip is not None and not callable(step.skip):
            problems.append(f'step {n}: skip is {step.skip!r}, not a function')
        nxt = step.next
        if not callable(nxt) and not isinstance(nxt, (str, End, Parallel)):
            problems.append(f'step {n}: next is {nxt!r}')
        if isinstance(nxt, str) and nxt not in self.steps:
            problems.append(f'step {n}: next step {nxt!r} is not declared')
        if isinstance(nxt, Parallel):
            problems += [f'step {n}: parallel target {t!r} is not declared' for t in nxt.steps if t not in self.steps]
        return problems

    # ---------- commands ----------

    def _start(self, run_dir: str, args: list[str]) -> RunState:
        if os.path.exists(run_dir):
            die(f'{run_dir} exists. Use another run directory, or run me without a command to resume a run there.')
        try:
            given = json.loads(args[0]) if args else {}
        except ValueError:
            given = None
        if not isinstance(given, dict):
            die('start: inputs must be one JSON object')
        inputs = _resolve_inputs(self.input_spec, given)
        os.makedirs(run_dir)
        state = RunState(runbook=os.path.basename(self.here), status=Status.RUNNING.value, inputs=inputs, sections=[])
        ProgressLog(run_dir).create(state.runbook, inputs)
        return state

    def _reply(self, run_dir: str, args: list[str]) -> RunState:
        sid, raw = args
        state = RunState.load(run_dir)
        section = state.section(sid)
        if section.status is not Status.RUNNING:
            die(f'section {sid} is {section.status.value}, not running')
        reply = _parse_reply(raw)
        step = self.steps.get(section.name)
        if reply['status'] == Status.DONE.value and isinstance(step, Step):
            problem = _reply_problem(reply, step.reply)
            if problem:
                reply = {'status': Status.FAILED.value, 'reason': f'invalid reply: {problem}'}
        section.reply = reply
        section.close(Status(reply['status']))
        ProgressLog(run_dir).append(f'{sid}: {json.dumps(reply, ensure_ascii=False)}')
        return state

    def _answer(self, run_dir: str, args: list[str]) -> RunState:
        sid, answer = args[0], args[1]
        words = args[2] if len(args) > 2 else answer
        state = RunState.load(run_dir)
        section = state.section(sid)
        if section.status is not Status.WAITING_FOR_HUMAN:
            die(f'section {sid} is {section.status.value}, not waiting_for_human')
        step = self.steps[section.name]
        choice = step.match(answer)
        if choice is None:
            die('answer must be one of: ' + ' | '.join(step.choices))
        section.note, section.answer = choice, words
        section.close(Status.DONE)
        if step.writes:
            with open(RunFiles(self.steps, run_dir, state).path(section, step.writes), 'w', encoding='utf-8') as f:
                f.write(words.rstrip('\n') + '\n')
        log = ProgressLog(run_dir)
        log.append(f'{sid}: answered: {choice}')
        if words != choice:
            log.append(f'{sid}: said: {words}')
        return state

    def _interrupted(self, run_dir: str, args: list[str]) -> RunState:
        return self._supersede(run_dir, args[0], NOTE_INTERRUPTED)

    def _relaunch(self, run_dir: str, args: list[str]) -> RunState:
        return self._supersede(run_dir, args[0], NOTE_RELAUNCHED)

    def _supersede(self, run_dir: str, sid: str, note: str) -> RunState:
        state = RunState.load(run_dir)
        section = state.section(sid)
        section.note = note
        section.close(Status.FAILED)
        ProgressLog(run_dir).append(f'{sid}: {note}')
        return state

    def _log(self, run_dir: str, args: list[str]) -> RunState:
        state = RunState.load(run_dir)
        ProgressLog(run_dir).append('orchestrator: ' + ' '.join(args))
        return state

    def _status(self, run_dir: str, args: list[str]) -> RunState:
        return RunState.load(run_dir)

    # ---------- advancing ----------

    def _advance(self, run_dir: str, state: RunState) -> list[str]:
        """Replays the run, opens sections for what is to launch, and returns the lines to print."""
        plan = Replay(self.steps, self.start_step, state).run()
        renderer = Renderer(self, run_dir, state)
        if plan.ending and plan.waiting:
            state.status = Status.RUNNING.value
            return renderer.wait_for_end(plan.ending, plan.waiting)
        if plan.ending:
            status = plan.ending.end.status
            if state.status != status:
                ProgressLog(run_dir).append(f'end: {status} ({plan.ending.why})')
            state.status = status
            return renderer.ended(plan.ending)
        opened = [self._open_section(run_dir, state, name, plan) for name in plan.launch]
        lines = renderer.pending(plan, opened)
        asking = any(s.status is Status.WAITING_FOR_HUMAN for s in state.sections)
        state.status = Status.WAITING_FOR_HUMAN.value if asking else Status.RUNNING.value
        return lines

    def _open_section(self, run_dir: str, state: RunState, name: str, plan: Plan) -> Section:
        step = self.steps[name]
        log = ProgressLog(run_dir)
        if isinstance(step, HumanStep):
            section = state.new_section(name, Status.WAITING_FOR_HUMAN)
            log.append(f'{section.label()}: asked: {RunFiles(self.steps, run_dir, state).substitute(step.question)}')
        else:
            executor = _resolve(step.executor, State(state.inputs, plan.done_count))
            section = state.new_section(name, Status.RUNNING, executor)
            log.append(f'{section.label()}: launched')
        return section

    # ---------- entry point ----------

    def main(self, argv: list[str] | None = None) -> int:
        """Run the command in argv (sys.argv by default); returns the exit code."""
        argv = sys.argv if argv is None else argv
        if len(argv) < 2 or argv[1] in ('-h', '--help'):
            print(__doc__.strip())
            return 1
        if argv[1] == '--check':
            problems = self.check()
            print('\n'.join(problems) if problems else 'flow.py is consistent.')
            return 1 if problems else 0
        if self.start_step is None:
            die('no start step: call rb.start(<name>)')
        run_dir = os.path.abspath(argv[1])
        name = argv[2] if len(argv) > 2 else 'status'
        command = COMMANDS.get(name) or die(f'unknown command {name!r}')
        args = [sys.stdin.read() if a == '-' else a for a in argv[3:]]
        too_many = command.max_args is not None and len(args) > command.max_args
        if len(args) < command.min_args or too_many:
            die(f'usage: flow.py <run> {name} {command.usage}'.rstrip())
        state = command.handler(self, run_dir, args)
        lines = self._advance(run_dir, state)
        state.save(run_dir)
        print('\n'.join(lines))
        return 0


def _parse_reply(raw: str) -> dict[str, Any]:
    """The executor's JSON, or the invalid-reply failure when it is not an object with a known status."""
    try:
        reply = json.loads(raw)
    except ValueError:
        return dict(INVALID_REPLY)
    if not isinstance(reply, dict) or reply.get('status') not in REPLY_STATUSES:
        return dict(INVALID_REPLY)
    return reply


def _reply_problem(reply: dict[str, Any], fields: dict[str, type]) -> str | None:
    """What is wrong with a done reply against the step's declared reply fields, if anything."""
    for name, typ in fields.items():
        if name not in reply:
            return f'no field {name!r}'
        if not _is_of_type(reply[name], typ):
            return f'field {name!r} must be {typ.__name__}, got {json.dumps(reply[name])}'
    return None


COMMANDS: dict[str, Command] = {
    'start': Command(Runbook._start, "['<inputs JSON>']", 0, 1),
    'reply': Command(Runbook._reply, "<section> '<reply JSON>'", 2, 2),
    'answer': Command(Runbook._answer, "<section> '<choice>' ['<verbatim words>' | -]", 2, 3),
    'interrupted': Command(Runbook._interrupted, '<section>', 1, 1),
    'relaunch': Command(Runbook._relaunch, '<section>', 1, 1),
    'log': Command(Runbook._log, "'<text>'", 1, None),
    'status': Command(Runbook._status, '', 0, 0),
}
