# ESLint Plugin Handle Errors

[![npm](https://img.shields.io/npm/v/eslint-plugin-handle-errors)](https://www.npmjs.com/package/eslint-plugin-handle-errors)

ESLint rules for handling errors.

## Installation

npm

```bash
npm install -D eslint-plugin-handle-errors
```

Yarn

```bash
yarn add -D eslint-plugin-handle-errors
```

pnpm

```bash
pnpm add -D eslint-plugin-handle-errors
```

## Usage

[Flat config](https://eslint.org/docs/latest/use/configure/configuration-files-new)
(**eslint.config.js**)

```javascript
import eslint from '@eslint/js';
import handleErrors from 'eslint-plugin-handle-errors';

export default [
    eslint.configs.recommended, // optional
    handleErrors.configs.recommended,
];
```

[Legacy config](https://eslint.org/docs/latest/use/configure/configuration-files)
(**.eslintrc**)

```json
{
    "extends": ["plugin:handle-errors/legacy-recommended"],
}
```

## Settings

### Logger functions

You can customize the logger functions that are used to log errors in your project.

```js
import eslint from '@eslint/js';
import handleErrors from 'eslint-plugin-handle-errors';

export default [
    {
        settings: {
            handleErrors: {
                loggerFunctions: ['Sentry.captureException', 'reportError'],
            },
        },
    },
    eslint.configs.recommended,
    handleErrors.configs.recommended,
];
```

## Rules

✅ Set in the `recommended` configuration\
🔧 Automatically fixable by the [`--fix`](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix)
CLI option\
💡 Manually fixable by
[editor suggestions](https://eslint.org/docs/latest/developer-guide/working-with-rules#providing-suggestions)

| Rule                                                                                                                       | Description                                      | ✅  | 🔧  | 💡  |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | :-: | :-: | :-: |
| [log-error-in-trycatch](https://github.com/Nodge/eslint-plugin-handle-errors/blob/main/src/rules/log-error-in-trycatch.ts) | Enforce error logging in Try-Catch blocks        | ✅  |     |     |
| [log-error-in-promises](https://github.com/Nodge/eslint-plugin-handle-errors/blob/main/src/rules/log-error-in-promises.ts) | Enforces error logging in Promise.catch handlers | ✅  |     |     |
