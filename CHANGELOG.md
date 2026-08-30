# eslint-plugin-handle-errors

## 0.4.1

### Patch Changes

- [#39](https://github.com/Nodge/eslint-plugin-handle-errors/pull/39) [`5f8362c`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/5f8362ce5327a212021b480988c379ead234b04c) Thanks [@Nodge](https://github.com/Nodge)! - Re-release of 0.4.0 through a repaired release pipeline. The rules, types and
  build output are identical to 0.4.0 — that version reached npm, but its git tag
  and GitHub release were never created, because `changesets/action` v1 detects
  published packages by scraping output that `@changesets/cli` 3 no longer prints.

## 0.4.0

### Minor Changes

- [#33](https://github.com/Nodge/eslint-plugin-handle-errors/pull/33) [`9e4aee1`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/9e4aee189eb8984f9c5b0b89861f8595582a73c5) Thanks [@Nodge](https://github.com/Nodge)! - Target ESLint 9 and 10, drop support for ESLint 7 and 8.

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

### Patch Changes

- [#34](https://github.com/Nodge/eslint-plugin-handle-errors/pull/34) [`07f79af`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/07f79af2c79077d973da88367bed1b77a16b7f36) Thanks [@Nodge](https://github.com/Nodge)! - Build with tsdown instead of tsup. tsup's declaration pipeline hardcodes the
  deprecated `baseUrl` compiler option, which is a hard error on TypeScript 6 and
  stops working entirely on TypeScript 7; tsdown builds cleanly on both.

    The bundle file names follow: `dist/index.cjs` and `dist/index.mjs`, with
    `dist/index.d.cts` and `dist/index.d.mts` beside them. The `exports` map is
    updated to match, so nothing changes for anyone importing the package by name.

## 0.3.1

### Patch Changes

- [#8](https://github.com/Nodge/eslint-plugin-handle-errors/pull/8) [`3e450b5`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/3e450b5ceaf79aadf81db22a55a1b205c2c4241c) Thanks [@Nodge](https://github.com/Nodge)! - Fix release workflow

## 0.3.0

### Minor Changes

- [#5](https://github.com/Nodge/eslint-plugin-handle-errors/pull/5) [`8920b2c`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/8920b2c6e0fa0576a3d61b4bdb00ee784c0e2fd3) Thanks [@Nodge](https://github.com/Nodge)! - [BREAKING] Use flat eslint config by default. The configs should be updates as follows:

    - For flat eslint config:

        - Before:

            ```javascript
            import eslint from '@eslint/js';
            import handleErrors from 'eslint-plugin-handle-errors';

            export default [
                eslint.configs.recommended, // optional
                handleErrors.configs['flat/recommended'],
            ];
            ```

        - After:

            ```javascript
            import eslint from '@eslint/js';
            import handleErrors from 'eslint-plugin-handle-errors';

            export default [
                eslint.configs.recommended, // optional
                handleErrors.configs.recommended,
            ];
            ```

    - For legacy esling config:

        - Before:

            ```json
            {
                "extends": ["plugin:handle-errors/recommended"]
            }
            ```

        - After:

            ```json
            {
                "extends": ["plugin:handle-errors/legacy-recommended"]
            }
            ```

- [#5](https://github.com/Nodge/eslint-plugin-handle-errors/pull/5) [`8920b2c`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/8920b2c6e0fa0576a3d61b4bdb00ee784c0e2fd3) Thanks [@Nodge](https://github.com/Nodge)! - feat: Support passing an error to a promise reject function like this:

    ```ts
    new Promise((resolve, reject) => {
        try {
            // do something
        } catch (err) {
            reject(err);
        }
    });
    ```

    Calling the reject function here is valid error handling.

### Patch Changes

- [#5](https://github.com/Nodge/eslint-plugin-handle-errors/pull/5) [`8920b2c`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/8920b2c6e0fa0576a3d61b4bdb00ee784c0e2fd3) Thanks [@Nodge](https://github.com/Nodge)! - chore: Upgrade eslint to v9 and pin dependencies

- [#5](https://github.com/Nodge/eslint-plugin-handle-errors/pull/5) [`8920b2c`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/8920b2c6e0fa0576a3d61b4bdb00ee784c0e2fd3) Thanks [@Nodge](https://github.com/Nodge)! - test: Add integration tests againt node 18/20/22 and eslint 7/8/9
