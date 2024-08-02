---
'eslint-plugin-handle-errors': minor
---

[BREAKING] Use flat eslint config by default. The configs should be updates as follows:

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
