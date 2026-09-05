# log-error-in-trycatch

📝 Enforce error logging in `try`/`catch` blocks.

💼 This rule is enabled in the ✅ `recommended` config.

<!-- end auto-generated rule header -->

## Rule details

A `catch` block that neither logs nor re-throws swallows the error: the failure disappears and nothing downstream can react to it. This rule requires every code path through a `catch` block to end in one of three ways:

- a call to a logger function (see [Settings](#settings)),
- `throw e` — re-throwing the original error,
- `throw new Error(...)` — throwing a new one.

"Every code path" is the important part. A `catch` block that logs only inside an `if` branch, or returns before reaching the logger, is still reported.

Examples of **incorrect** code:

```js
try {
    doSomething();
} catch (e) {
    // the error is swallowed
}

try {
    doSomething();
} catch (e) {
    if (isRetryable(e)) {
        console.error(e);
    }
    // the non-retryable path logs nothing
}

try {
    doSomething();
} catch (e) {
    if (isExpected(e)) {
        return null;
    }
    console.error(e);
}
```

Examples of **correct** code:

```js
try {
    doSomething();
} catch (e) {
    console.error(e);
}

try {
    doSomething();
} catch (e) {
    throw new Error('Failed to do something', { cause: e });
}

try {
    doSomething();
} catch (e) {
    if (isExpected(e)) {
        console.warn(e);
        return null;
    }
    throw e;
}
```

Passing the error to a promise `reject` callback also counts as handling it:

```js
new Promise((resolve, reject) => {
    try {
        resolve(doSomething());
    } catch (e) {
        reject(e);
    }
});
```

## Settings

The set of functions that count as loggers is configured through `settings.handleErrors.loggerFunctions`, shared by all rules in this plugin. It defaults to `['console.warn', 'console.error']`.

An entry is a plain function name or a member chain of any depth, and the chain may start with `this` or `super`: `reportError`, `logger.error`, `this.logger.error`, `app.services.log.error`. Chains are matched as written, so `logger.error` does not match a `this.logger.error` call. An entry that is not a valid chain is reported on the file being linted.

```js
export default [
    {
        settings: {
            handleErrors: {
                loggerFunctions: ['Sentry.captureException', 'reportError'],
            },
        },
    },
    handleErrors.configs.recommended,
];
```

## When not to use it

If your codebase deliberately swallows errors in specific places, disable the rule there with an `eslint-disable-next-line` comment rather than turning it off project-wide — the point of the rule is that each such place is a conscious decision.

## Related

- [`log-error-in-promises`](./log-error-in-promises.md) — the same requirement for `.catch()` handlers.
- [`preserve-caught-error`](https://eslint.org/docs/latest/rules/preserve-caught-error) from ESLint core — requires the original error to be passed as `cause` when you throw a new one.
