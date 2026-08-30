---
'eslint-plugin-handle-errors': patch
---

Build with tsdown instead of tsup. tsup's declaration pipeline hardcodes the
deprecated `baseUrl` compiler option, which is a hard error on TypeScript 6 and
stops working entirely on TypeScript 7; tsdown builds cleanly on both.

The bundle file names follow: `dist/index.cjs` and `dist/index.mjs`, with
`dist/index.d.cts` and `dist/index.d.mts` beside them. The `exports` map is
updated to match, so nothing changes for anyone importing the package by name.
