#!/usr/bin/env python3
"""Steps and transitions of runbook-task-cycle. Run with --help for the commands."""
from runbook import Runbook, end, parallel

rb = Runbook()

rb.inputs(brief=str, repo=str, profile=str, checks='', task='', scope='', maxFixRounds=2,
          top='claude/claude-fable-5-1:high', strong='claude/opus[1m]:high', light='claude/sonnet:low',
          second='codex/gpt-6.1-sol:high')

# Every executor is a thronglet. The agent strings are inputs, so a project's profile can replace them at start; each
# step lists the agent inputs of the executors it may run with, and the launch message carries them.
for name in ('top', 'strong', 'light', 'second'):
    rb.executor(name, f'a thronglet: run_thronglet with the agent the `{name}` line of the message gives, '
                      f'cwd the `repo` line')

rb.start('preflight')

rb.step('preflight', executor='light', prompt='prompts/00-preflight.md', inputs=['light'],
        reads=['profile.md', 'working tree'], writes=['preflight.md'], reply={'clean': bool},
        next=lambda r, s: 'implement' if r.clean else 'ask-dirty')

rb.step('implement', executor='strong', prompt='prompts/01-implement.md', inputs=['checks', 'scope', 'strong'],
        reads=['profile.md', 'brief.md', 'working tree'], writes=['implement.md'],
        next='checks')

rb.step('checks', executor='light', prompt='prompts/02-checks.md', inputs=['checks', 'scope', 'light'],
        reads=['profile.md', 'working tree'], writes=['checks.md'], reply={'passed': bool},
        next=lambda r, s: parallel('review-a', 'review-b') if r.passed
        else ('fix-checks' if not s.done('fix-checks') else end('failed', 'read <run>/checks.md')))

rb.step('fix-checks', executor='strong', prompt='prompts/03-fix-checks.md', inputs=['checks', 'scope', 'strong'],
        reads=['profile.md', 'brief.md', 'implement.md', 'checks.md', 'working tree'], writes=['fix-checks.md'],
        reply={'fixed': bool},
        next=lambda r, s: 'checks' if r.fixed else end('failed', 'read <run>/fix-checks.md'))

for letter, executor in (('a', 'strong'), ('b', 'second')):
    rb.step(f'review-{letter}', executor=executor, prompt='prompts/04-review.md',
            inputs=['checks', 'scope', executor, ('id-prefix', letter)],
            reads=['profile.md', 'brief.md', 'preflight.md', 'implement.md', 'fix-checks.md', 'working tree'],
            writes=[f'review-{letter}.md'],
            reply={'findings': int},
            next='triage')

rb.step('triage', executor='top', prompt='prompts/05-triage.md', inputs=['scope', 'top'], after=('review-a', 'review-b'),
        reads=['profile.md', 'brief.md', 'review-a.md', 'review-b.md', 'working tree'], writes=['triage.md'],
        reply={'to_fix': int},
        skip=lambda s: 'polish' if all(getattr(s.reply(f'review-{x}'), 'findings', None) == 0 for x in 'ab') else None,
        next=lambda r, s: 'polish' if r.to_fix == 0 else 'fix')

rb.step('fix', executor='strong', prompt='prompts/06-fix.md', inputs=['checks', 'scope', 'strong'],
        reads=['profile.md', 'brief.md', 'triage.md', 'verify.md', 'rounds.md', 'working tree'], writes=['fix.md'],
        next='verify')

rb.step('verify', executor='strong', prompt='prompts/07-verify.md', inputs=['checks', 'scope', 'strong'],
        reads=['profile.md', 'triage.md', 'fix.md', 'verify.md', 'working tree'], writes=['verify.md'],
        reply={'unresolved': int, 'passed': bool},
        next=lambda r, s: 'polish' if r.unresolved == 0 and r.passed
        else ('fix' if s.done('verify') < s.inputs.maxFixRounds else 'ask-rounds'))

rb.step('polish', executor='strong', prompt='prompts/08-polish.md', inputs=['checks', 'scope', 'strong'],
        reads=['profile.md', 'brief.md', 'preflight.md', 'working tree'], writes=['polish.md'],
        reply={'passed': bool},
        next=lambda r, s: end('ready', 'read <run>/polish.md') if r.passed else end('needs_attention', 'read <run>/polish.md'))

rb.human('ask-rounds', writes='rounds.md', choices=['one more round', 'stop'],
         question='Fix rounds are spent. `<run>/verify.md` lists what is unresolved or which checks still fail. '
                  'One more round, or stop here? Anything you write here goes to the coder for the next round.',
         next=lambda choice, s: 'fix' if choice == 'one more round' else end('needs_attention', 'read <run>/verify.md'))

rb.human('ask-dirty', choices=['continue', 'stop'],
         question='The repository already has uncommitted changes, see `<run>/preflight.md`. '
                  'Continue, and they become part of what is implemented on and reviewed, or stop?',
         next=lambda choice, s: 'implement' if choice == 'continue' else end('failed', 'read <run>/preflight.md'))

if __name__ == '__main__':
    raise SystemExit(rb.main())
