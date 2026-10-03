# runbook-task-cycle

A [runbook](../agent-runbook-authoring) for one coding task in a repository, from brief to reviewed, uncommitted changes. A coder implements the brief, a cheap model runs the checks, two different models review independently, an arbiter triages their findings against the code, the coder fixes what is worth fixing, a verifier checks the fixes, and a last pass cleans up comments and wording. The human is asked only when nothing names the checks, when the repository is dirty at the start, or when the fix rounds run out. Commit, PR and CI stay outside.

Every step is a thronglet: [throng](https://github.com/Nodge/throng-mcp) is an MCP server that runs Claude Code, Codex or OpenCode as a subagent of any of them and returns the agent's final message, which is the shape a runbook step already has. The session that runs this runbook needs it.

```
SKILL.md        what the orchestrator reads: inputs, execution rules, end of run
flow.py         steps, transitions, the default agent of each executor
runbook.py      the engine, a copy of agent-runbook-authoring's
prompts/        common.md and one prompt per step
```

## Models

Four executors, each an agent string as throng names it, `<harness>/<model>[:<effort>]`:

| Executor | Steps | Default |
|---|---|---|
| `top` | triage | `claude/fable:high` |
| `strong` | implement, fix-checks, fix, polish, review A, verify | `claude/opus:high` |
| `light` | preflight, checks | `claude/sonnet:low` |
| `second` | review B | `codex/gpt-6.1-sol:high` |

Each is an input of the run, so a project changes them in its profile and the human changes them for one run in words: "run the task cycle with astra as the second reviewer".

## Try it

Install the skill, see [the repository README](../../README.md), then make a repository from the fixture in [`examples/textkit`](../../examples/textkit):

```bash
cp -r examples/textkit /tmp/textkit && cd /tmp/textkit && git init -q && git add -A && git commit -qm init
```

Start a session in `/tmp/textkit` and ask: "Run runbook-task-cycle: add an optional `max_length` to `slugify`, cut on a word boundary; checks `python3 -m unittest`." [`examples/runs`](../../examples/runs) has the files of such a run.

## The profile

A project adapts the runbook with one file, `<repo>/.agent-runbooks/task-cycle.md`, committed. The orchestrator copies it into the run directory, every executor reads it, and each of its sections replaces a default of the runbook. All sections are optional; without the file the defaults hold: git, the `checks` input, the repository's instructions file. Keep `.agent-runbooks/runs/` out of version control, not the whole directory.

```markdown
# Task cycle

## Checks

`pnpm typecheck`, `pnpm lint` and `pnpm test`, from the repository root, each even if an earlier one failed. `pnpm test` takes a minute; the e2e suite is not part of the checks.

## VCS

Git. Everything uncommitted is the changes, except `pnpm-lock.yaml`: the install rewrites it, and nobody reviews it.

## Rules

- Comments, messages and documentation in English.
- `@ts-expect-error` is a finding, whatever the reason next to it.
- Generated files under `__generated__/` are regenerated with `pnpm codegen`, never edited.

## Executors

- second: codex/gpt-6-astra:high
- light: claude/sonnet:medium
```

What each section is for:

- **Checks**: what to run, from where, and what counts as a check that was not called for. Replaces the `checks` input, which the human then omits. Needed when the checks are more than one command, or depend on which files changed: a monorepo that runs the checks of each package the changes touch.
- **VCS**: how to list and show the uncommitted changes, for a repository under something other than git.
- **Rules**: the project rules that matter in a task cycle, for the coder and the reviewers' third axis. A digest, since the executors read the instructions file anyway: the rules that are broken often, or that the file states too far down to be noticed.
- **Executors**: the agent of the executors to change, one per line.

The profile is prose read by models, so anything the steps need to know about the project goes there in the words you would use for a new colleague. When the profile is not enough, because the project needs another step or another graph, copy the skill into the project's skills directory under another name and edit `flow.py` and the prompts. From then on it is yours: the engine upgrade procedure is in [agent-runbook-authoring](../agent-runbook-authoring/SKILL.md).
