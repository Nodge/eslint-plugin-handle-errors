---
name: runbook-task-cycle
description: One coding task end to end in a repository. A coder, the project's checks, two independent reviews by different models, triage, fix rounds with verification, a polish pass, every step a thronglet. Inputs brief, repo, optional checks, task, scope, maxFixRounds and the executors' agents; a project profile sets the defaults. Leaves the changes uncommitted.
---

# Task cycle

Leaves one task implemented in a repository, uncommitted, with the checks green and every review finding triage marked to fix either fixed with evidence or listed for the human. Commit, PR and CI happen outside.

Every step runs as a thronglet, so the session needs the [throng](https://github.com/Nodge/throng-mcp) MCP server: `run_thronglet`, `wait_thronglet`, `send_message`. Throng does not wake a session up: launch a step with `background: true` and, in the same turn, collect it with `wait_thronglet`, one call per step, `timeout_s` at the largest value the tool accepts, called again when it returns before the step has ended. You launch every thronglet yourself, so no executor relays another agent's reply.

## Inputs

- `brief`: the task brief as text. The orchestrator saves it to `<run>/brief.md` and passes `"brief": "brief.md"` to `start`
- `repo`: absolute path of the repository with the task's branch checked out, the directory this session started in unless the human names another
- `profile`: the project's profile, `<repo>/.agent-runbooks/task-cycle.md`. The orchestrator reads it before `start`, copies it to `<run>/profile.md`, an empty file when the repository has none, and passes `"profile": "profile.md"`. Its Executors section, lines `- <executor>: <agent>`, goes to `start` as inputs under those names. The rest of it is for the executors. [`README.md`](README.md) next to this file describes the sections
- `checks`: the shell command that checks the project, run from `repo`, e.g. `python3 -m unittest` or `pnpm typecheck && pnpm lint && pnpm test`. Omit it when the profile has a Checks section. Ask the human when neither is there
- `task`: a ticket key or short id, used as given in the run directory's name. Optional
- `scope`: a directory the changes stay in, relative to `repo`, such as `packages/grid` in a monorepo. Optional, empty means the whole repository
- `maxFixRounds`: positive integer, default 2. One round is one pass of fix and verify
- `top`, `strong`, `light`, `second`: the agent of each executor as throng names it, `<harness>/<model>[:<effort>]`. The defaults are in the Models table of `README.md`, the profile's Executors section replaces them for the project, the human's words replace both for one run
- `run-id`: given only to resume an interrupted run
- Smoke input, in a repository with a profile and green checks: brief "Add a file `SMOKE.md` with the single line `smoke`", no other input. The expected path is the shortest one: the checks pass and the reviewers find nothing. The human deletes `SMOKE.md` after. Without a profile: the fixture `examples/textkit` of [the skill's repository](https://github.com/Nodge/skills), copied to a fresh directory and committed to a new git repository by the human before the run, brief "Add `__version__ = '0.1.0'` to `textkit/__init__.py`", checks `python3 -m unittest`. The human removes the directory after. A second smoke input reaches a human step: the same fixture with an untracked file `notes.txt` left in it, and the answer `stop` at ask-dirty

Before a run the human makes sure the checks are green on the branch. The runbook does not fix what was red already.

## Run directory

`<the directory this session started in>/.agent-runbooks/runs/<YYYYMMDD>-<slug>/`. Slug: `task` when it is given, else three or four words from the brief in kebab-case, for example `add-version-constant`.

## Execution rules

You are the orchestrator of this run. Orchestrating takes a session that can launch subagents and learn when they finish. If yours cannot, stop and say so. During the run you do only these things:

- run `python3 <skill>/flow.py …` as written below
- save the input files the Inputs section names into the run directory `start` created
- launch steps as subagents, with the message `flow.py` prints
- read a step's output file only to quote it to the human
- ask the human, and report the end of the run
- change the brief as the Brief changes section says

Nothing else. No other command, no reading of `flow.py`, `state.json`, `progress.md` or the prompt files, no editing of anything in the run directory beyond `brief.md` as the Brief changes section says. `<skill>` is the directory this `SKILL.md` was loaded from.

Starting

- The run directory is `.agent-runbooks/runs/<YYYYMMDD>-<slug>` under the directory your session started in, with today's local date. Run `python3 <skill>/flow.py <run> start '<the inputs you were given, as one JSON object>'` first, with every input the Inputs section saves to a file given as that file name: it creates the directory, or refuses because it exists, in which case add `-2`, `-3` to the name and start again. Then save the input files the Inputs section names into the directory it created.
- Resume: `python3 <skill>/flow.py <run>`.

flow.py

- It keeps the state of the run and prints what to do: which steps to launch, with which executor and what message, whom to wait for, what to ask the human, or that the run has ended. Do all of what it prints, then wait. Every command it asks you to run next is printed in full.
- A step's message arrives: take the last JSON object in it and run the `reply` command printed for that step with that JSON. No JSON object in the message: pass `{"status": "failed", "reason": "invalid reply"}`. Any JSON argument, for `start` or `reply`, with a single quote (`'`) in it goes through stdin: put `-` in place of the JSON and pipe it in with a quoted heredoc.
- The human answers a question: map the answer to one of the choices `flow.py` listed, ask again if none fits, and run the `answer` command printed with that choice and the human's words verbatim. A free-text question takes the words alone. `flow.py` keeps the words and writes them where the steps that follow read them.
- A running step's executor is gone, because the session is new or the tool reports it dead: `flow.py <run> interrupted <section>`. Executors you launched in this conversation are not gone: wait for them.
- You departed from these rules, or did something `flow.py` does not know about: `flow.py <run> log '<one line>'`.

Launching

- Launch every step `flow.py` lists, with the executor it names, and send exactly the text between `--- message ---` and `--- end of message ---`. Add nothing, apart from lines your harness or your own rules require in every subagent prompt. An executor that only relays another agent's reply gets one more line: "Return the agent's final message verbatim."

Waiting

- Waiting costs zero turns. Pick the branch that matches your harness.
  - You can launch a subagent in the background and get woken up when it finishes, and ending your turn does not end your session: launch the ready steps that way and end your turn. On a wake-up, record the reply, do what `flow.py` prints, end your turn.
  - Otherwise, which includes running nested in another agent where the end of your turn is the end of your run: launch the ready steps in the foreground, in parallel if your harness allows several calls at once, otherwise one after another. Set every timeout or yield parameter your tool accepts to 24 hours or its maximum. If a call returns while the step still runs, call the wait again and do nothing else.
- Either way the step's completion is the only event. No polling, no sleeping, no reading ahead, no status messages while it runs. An hour-long step is a normal working state.

Human steps and side effects

- `flow.py` tells you when to ask the human and what. Ask, then wait for the answer the way you wait for a step. A failed step with side effects is relaunched only after the human says yes: `flow.py <run> relaunch <section>`.

Brief changes

- The human changes the task while implement is running or has not launched yet: edit `<run>/brief.md` in place, so it reads as if written that way from the start, then `flow.py <run> log 'brief changed: <one line>'`; that line is the trace of what changed. If implement is running, `send_message` its thronglet with `steer: true`, saying that the brief at that path changed, the one line, and that it must re-read the brief and continue. Then wait for the step as before.
- After implement has reported, the run goes on with the brief it had. Tell the human that the change is a second run on the same tree once this one ends: its brief describes the delta and names the first run's directory, and the human answers preflight's ask-dirty with `continue`.

Ending

- When `flow.py` prints `end`, report what it says to the human: the status, the run directory, the file to read. The run is over and these rules no longer bind you.

## Steps

Declared in `flow.py` next to this file: inputs, executors, steps with their prompts, what each reads and writes, and the transitions between them. `flow.py` drives the run and prints, for every launch, the executor's model and tool. This section is a pointer, not a copy.

## End of run

- `ready`: both reviewers found nothing, so triage was skipped, or triage marked nothing to fix, or every finding to fix is resolved with evidence; the checks are green and the polish pass is done. The human reads the polish file `flow.py` names, then the last `verify.md` if there is one, else `triage.md` if there is one. Step outputs in the run directory carry the order of their launch as a prefix, `NN-`, so the last `verify.md` is the highest-numbered `*-verify.md`. Findings not worth fixing are under "Rejected" in `triage.md` with reason "not worth it". Then commit, PR, CI.
- `needs_attention`: findings to fix remain unresolved or the checks still fail. `verify.md` says which, or `polish.md` if the polish pass left them red. The human decides.
- `failed`: a step failed or was blocked, the checks stayed red after one fix attempt or the coder found no fix within the brief, or the human stopped at ask-dirty. The file `flow.py` names at the end says why.

Report the status, the run directory and the file `flow.py` names.
