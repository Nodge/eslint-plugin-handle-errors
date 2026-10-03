# Task cycle

## Checks

From the repository root, in this order, each even if an earlier one failed: `ci:docs` and the examples load the plugin from `dist/`, which `ci:build` writes.

1. `pnpm run ci:lint`
2. `pnpm run ci:typecheck`
3. `pnpm run ci:fmt`
4. `pnpm run ci:tests`
5. `pnpm run ci:build`
6. `pnpm run ci:docs`
7. `pnpm --recursive --filter './examples/*' run lint`

All seven take about 15 seconds. They are the CI jobs on one Node version and the installed ESLint 10; `examples/eslint-v9` is the only check that loads the plugin on ESLint 9. The CI matrix (Node 22/24/26, ESLint 9/10) is not part of the checks.

`pnpm run ci:changesets` is not a check: it sees only committed changesets and fails on any uncommitted change to `src/`. The changeset rule below covers it.

`ci:fmt` failing is fixed with `pnpm run fmt`.

## Rules

- English in everything that lands in the repository: code, comments, test names, docs, changesets.
- Any change under `src/` or to `package.json` comes with a new changeset in `.changeset/`, written by hand (`changeset add` is interactive): `patch` for a fix, `minor` for new behaviour, a new option, or a breaking change while the version is `0.x`; `major` only when the brief asks for it. The body tells a user of the plugin what changes for them, in prose, with the code shapes whose verdict changes in code spans, in the style of `CHANGELOG.md`. A change with nothing to release, such as tests only, gets an empty changeset: frontmatter with no packages and one line saying why. A missing changeset or a wrong bump is a finding.
- The header of each `docs/rules/<rule>.md` and the rules table in `README.md` between the `auto-generated` markers are generated from the rules' `meta` by `pnpm run docs`. After changing `meta`, rerun it; those parts are never edited by hand. The prose below a rule doc's header is hand-written and follows the rule's behaviour: options and examples change with it.
- Every behaviour change and every fix comes with test cases in `src/rules/<rule>.test.ts` that fail without it. Suites go through `runRuleTester`, which runs them under espree and typescript-eslint with the same expectations; `runTypescriptRuleTester` is only for syntax espree cannot parse. A change that makes a rule accept more code also adds an `invalid` case for the nearest shape that must still be reported.
- The plugin supports ESLint 9 and 10 (`peerDependencies`). Rule code uses only APIs both have; the checks run the test suites on 10 only, so an API that ESLint 9 lacks is a finding.
- `dist/` is build output: never edited, never part of the changes.
