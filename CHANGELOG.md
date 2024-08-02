# eslint-plugin-handle-errors

## 0.3.0

### Minor Changes

-   [#5](https://github.com/Nodge/eslint-plugin-handle-errors/pull/5) [`8920b2c`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/8920b2c6e0fa0576a3d61b4bdb00ee784c0e2fd3) Thanks [@Nodge](https://github.com/Nodge)! - [BREAKING] Use flat eslint config by default. The configs should be updates as follows:

    -   For flat eslint config:

        -   Before:

            ```javascript
            import eslint from '@eslint/js';
            import handleErrors from 'eslint-plugin-handle-errors';

            export default [
                eslint.configs.recommended, // optional
                handleErrors.configs['flat/recommended'],
            ];
            ```

        -   After:

            ```javascript
            import eslint from '@eslint/js';
            import handleErrors from 'eslint-plugin-handle-errors';

            export default [
                eslint.configs.recommended, // optional
                handleErrors.configs.recommended,
            ];
            ```

    -   For legacy esling config:

        -   Before:

            ```json
            {
                "extends": ["plugin:handle-errors/recommended"]
            }
            ```

        -   After:

            ```json
            {
                "extends": ["plugin:handle-errors/legacy-recommended"]
            }
            ```

-   [#5](https://github.com/Nodge/eslint-plugin-handle-errors/pull/5) [`8920b2c`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/8920b2c6e0fa0576a3d61b4bdb00ee784c0e2fd3) Thanks [@Nodge](https://github.com/Nodge)! - feat: Support passing an error to a promise reject function like this:

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

-   [#5](https://github.com/Nodge/eslint-plugin-handle-errors/pull/5) [`8920b2c`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/8920b2c6e0fa0576a3d61b4bdb00ee784c0e2fd3) Thanks [@Nodge](https://github.com/Nodge)! - chore: Upgrade eslint to v9 and pin dependencies

-   [#5](https://github.com/Nodge/eslint-plugin-handle-errors/pull/5) [`8920b2c`](https://github.com/Nodge/eslint-plugin-handle-errors/commit/8920b2c6e0fa0576a3d61b4bdb00ee784c0e2fd3) Thanks [@Nodge](https://github.com/Nodge)! - test: Add integration tests againt node 18/20/22 and eslint 7/8/9
