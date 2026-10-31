---
'eslint-plugin-handle-errors': patch
---

The rule descriptions no longer say "Enforce error logging". Both rules also accept rethrowing the error, throwing a new one and handing it to `reject` of a `new Promise` executor, so the descriptions now read "Disallow `catch` blocks that drop the error" and "Disallow promise `.catch()` handlers that drop the error". What the rules report does not change.
