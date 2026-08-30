# log-error-in-promises

Enforce error logging in promise `.catch()` handlers.

💼 Enabled in the ✅ `recommended` configuration.

## Rule details

This is [`log-error-in-trycatch`](./log-error-in-trycatch.md) applied to the
promise form of error handling. Every code path through a `.catch()` handler must
either call a logger function, re-throw the original error, or throw a new one.

Examples of **incorrect** code:

```js
promise.catch(e => {
    // the error is swallowed
});

promise.catch(e => {
    if (isRetryable(e)) {
        console.error(e);
    }
    // the non-retryable path logs nothing
});

promise.catch(e => {
    if (isExpected(e)) {
        return null;
    }
    console.error(e);
});
```

Examples of **correct** code:

```js
promise.catch(e => {
    console.error(e);
});

promise.catch(e => {
    throw new Error('Request failed', { cause: e });
});

promise.then(handle).catch(reportError);
```

Passing the handler straight to a promise `reject` callback also counts:

```js
new Promise((resolve, reject) => {
    doSomething().then(resolve).catch(reject);
});
```

## Settings

See [`log-error-in-trycatch`](./log-error-in-trycatch.md#settings) — the
`settings.handleErrors.loggerFunctions` option is shared by both rules.

## When not to use it

The rule matches any `.catch()` call by shape, so a non-promise object with a
`catch` method is reported as well. If your codebase has such an API, disable the
rule at those call sites.

## Related

- [`log-error-in-trycatch`](./log-error-in-trycatch.md) — the same requirement
  for `try`/`catch` blocks.
- [`preserve-caught-error`](https://eslint.org/docs/latest/rules/preserve-caught-error)
  from ESLint core — requires the original error to be passed as `cause` when
  you throw a new one.
