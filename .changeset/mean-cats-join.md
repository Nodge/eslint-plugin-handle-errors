---
'eslint-plugin-handle-errors': minor
---

feat: Support passing an error to a promise reject function like this:

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
