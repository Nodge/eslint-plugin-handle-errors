---
'eslint-plugin-handle-errors': minor
---

Support logger functions behind member chains of any depth, including a leading `this` or `super`.

`settings.handleErrors.loggerFunctions` accepted only `method` or `object.method`; anything longer,
such as `this.logger.error` or `app.services.log.error`, threw while the rule was being loaded and
took the whole ESLint run down with it. Chains of any depth are now both configurable and matched,
and an entry that cannot be parsed is reported on the linted file instead of throwing.
