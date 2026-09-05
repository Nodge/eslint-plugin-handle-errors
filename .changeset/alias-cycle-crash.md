---
'eslint-plugin-handle-errors': patch
---

A handler that refers to a variable initialised from itself, such as `var handler = handler`, no longer takes the whole ESLint run down with `RangeError: Maximum call stack size exceeded`. Both rules follow chains of aliases when looking for a promise `reject`, and that walk kept no record of the variables it had already seen, so a cycle of aliases recursed forever and a long chain recursed as deep as the chain.
