# ESLint Plugin Handle Errors

[![npm](https://img.shields.io/npm/v/eslint-plugin-handle-errors)](https://www.npmjs.com/package/eslint-plugin-handle-errors)

Swallowed errors are the ones you learn about last. An empty `catch (e) {}`, a `.catch(() => null)` that was meant to be temporary, a handler that logs only on one branch: the failure disappears, and the first symptom shows up somewhere else entirely.

This plugin makes ESLint check that the errors your code catches go somewhere. A `catch` block or a `.catch()` handler has to do something with the error: log it, re-throw it, or throw a new error in its place. The check follows every code path through the handler instead of just looking for a logger call somewhere inside it, so a handler that logs inside an `if` and stays silent on the other branch is still reported.

What counts as a logger is a setting. The default is `console.warn` and `console.error`; a list of your own, such as `Sentry.captureException` or `this.logger.error`, replaces it.

## Requirements

ESLint 9 or 10, running on Node.js `^22.13 || >=24`. Only
[flat config](https://eslint.org/docs/latest/use/configure/configuration-files)
is supported.

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

**eslint.config.js**

```javascript
import eslint from '@eslint/js';
import handleErrors from 'eslint-plugin-handle-errors';

export default [
    eslint.configs.recommended, // optional
    handleErrors.configs.recommended,
];
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

| Rule                                                         | Description                                        | ✅  | 🔧  | 💡  |
| ------------------------------------------------------------ | -------------------------------------------------- | :-: | :-: | :-: |
| [log-error-in-trycatch](docs/rules/log-error-in-trycatch.md) | Enforce error logging in try/catch blocks          | ✅  |     |     |
| [log-error-in-promises](docs/rules/log-error-in-promises.md) | Enforce error logging in promise .catch() handlers | ✅  |     |     |
