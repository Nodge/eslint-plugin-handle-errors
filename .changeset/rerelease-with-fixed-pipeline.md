---
'eslint-plugin-handle-errors': patch
---

Re-release of 0.4.0 through a repaired release pipeline. The rules, types and
build output are identical to 0.4.0 — that version reached npm, but its git tag
and GitHub release were never created, because `changesets/action` v1 detects
published packages by scraping output that `@changesets/cli` 3 no longer prints.
