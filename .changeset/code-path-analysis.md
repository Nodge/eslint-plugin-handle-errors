---
'eslint-plugin-handle-errors': minor
---

Both rules now work out the code paths through a catch block with the code path analysis of ESLint,
instead of approximating them with a stack of block statements.

This fixes the false positive on a logger call returned from the handler: `return console.error(e)` is
accepted by both rules now. `ReturnStatement` was visited before its own argument, so the return was
recorded as an unhandled exit from the block before the logger inside it was seen.

The new engine also sees branches that are not blocks, and paths that never terminate, so a few more
shapes change their verdict:

- reported now, accepted before: a `switch` where some case does not log, a conditional expression or
  an `&&` / `||` / `??` chain that logs in one branch only, and a catch block that retries forever
  without logging;
- accepted now, reported before: a logger call in a `do ... while` body or in any other loop that
  always runs at least once, an `if`/`else` that logs in both branches without returning, a logger
  call inside a bare nested block, and a catch block that no live code path reaches.
