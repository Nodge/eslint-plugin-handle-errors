---
'eslint-plugin-handle-errors': major
---

Target ESLint 9 and 10, drop support for ESLint 7 and 8.

- `peerDependencies` is now `eslint: >=9`, and `engines.node` is
  `^22.13 || >=24`. ESLint 10 still allows `^20.19`, but node 20 reached
  end-of-life in April 2026 and is not tested here.
- The `legacy-recommended` config is removed. ESLint 10 dropped the `.eslintrc`
  format entirely; stay on 0.3.1 if you still need it.
- `meta.version` is injected from `package.json` at build time instead of being
  a hardcoded literal that had drifted to `0.2.0`.
- The plugin object registered inside `configs.recommended` now carries `meta`,
  so ESLint can report the plugin name and version in the context where the
  plugin is actually loaded.
- `log-error-in-promises` had `log-error-in-trycatch`'s description; both rules
  now describe what they check and link to their documentation page.
