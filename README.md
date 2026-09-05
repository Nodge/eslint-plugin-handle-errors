# ESLint Plugin Handle Errors

[![npm](https://img.shields.io/npm/v/eslint-plugin-handle-errors)](https://www.npmjs.com/package/eslint-plugin-handle-errors)

An empty `catch (e) {}` is the bug you learn about last. Nothing gets logged, your error monitoring never sees it, and the first report comes from a user.

This plugin adds ESLint rules for `catch` blocks and `.catch()` handlers. Each one has to log the error, re-throw it, or throw a new error in its place. The check follows every code path through the handler instead of looking for a logger call anywhere inside it, so a handler that logs in only one branch is reported:

```js
try {
    await saveDraft(draft);
} catch (e) {
    if (isNetworkError(e)) {
        console.error(e);
    }
    // reported: every other error is dropped here
}
```

Each path can handle the error its own way, as long as none of them drops it:

```js
try {
    await saveDraft(draft);
} catch (e) {
    if (isNetworkError(e)) {
        console.warn(e);
        scheduleRetry(draft);
        return;
    }
    throw e;
}
```

Which functions count as loggers is a setting. The default is `console.warn` and `console.error`. Your own list, such as `Sentry.captureException` or `this.logger.error`, replaces it rather than extending it.

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

## Works together with

This plugin checks that a `catch` block or a `.catch()` handler does something with the error. These rules close the neighbouring ways to lose one:

- [`preserve-caught-error`](https://eslint.org/docs/latest/rules/preserve-caught-error) (ESLint core): when you throw a new error, the original has to go in as `cause`.
- [`only-throw-error`](https://typescript-eslint.io/rules/only-throw-error) (typescript-eslint) or [`no-throw-literal`](https://eslint.org/docs/latest/rules/no-throw-literal) (ESLint core): thrown values have to be `Error` objects, so they carry a stack.
- [`prefer-promise-reject-errors`](https://eslint.org/docs/latest/rules/prefer-promise-reject-errors) (ESLint core): the same for `reject()`, which this plugin counts as handling.
- [`no-unsafe-finally`](https://eslint.org/docs/latest/rules/no-unsafe-finally) (ESLint core): a `return` inside `finally` discards the exception in flight.
- [`handle-callback-err`](https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/handle-callback-err.md) (eslint-plugin-n): the `err` argument of a Node-style callback has to be used.
