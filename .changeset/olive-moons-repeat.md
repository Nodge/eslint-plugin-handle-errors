---
'eslint-plugin-handle-errors': patch
---

Fix how `reject` of a `new Promise` executor is recognised.

Handing the error to `reject` counts as handling it, and three shapes were decided wrongly. A `reject` parameter with a default value (`(resolve, reject = noop) => ...`) and a variable written more than once (`var renamed = noop; var renamed = reject`) were reported although the error was handed over; so was a variable assigned after it was declared (`let renamed; renamed = reject`). In the other direction, a `reject` parameter of a callback that merely sits inside a `new Promise` argument, rather than being the executor itself, silently counted as handling and is now reported.
