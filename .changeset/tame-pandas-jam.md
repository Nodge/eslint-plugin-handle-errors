---
'eslint-plugin-handle-errors': patch
---

Add a `main` entry point and generate the rule docs from rule metadata.

`package.json` gained `"main": "./dist/index.cjs"`. The `exports` map only answers bare specifiers, so tools that `require()` the package by path — `eslint-doc-generator` among them — could not load the plugin at all.

Rule descriptions now carry the markdown they are rendered with (`` `try`/`catch` ``, `` `.catch()` ``), and `meta.docs.url` points at `Nodge` rather than `nodge`.
