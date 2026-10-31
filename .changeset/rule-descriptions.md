---
'eslint-plugin-handle-errors': patch
---

The rule descriptions now say what the rules accept: a `catch` block or a `.catch()` handler has to log the error, rethrow it, throw a new one or hand it to `reject` of a `new Promise` executor. The old wording, "Enforce error logging", named only logging. The README rules table and the rule doc headers carry the new descriptions. Nothing changes in what is reported.
