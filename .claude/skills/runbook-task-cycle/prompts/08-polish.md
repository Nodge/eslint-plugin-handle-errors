# Polish

You are an experienced engineer, the coder of this task. The task is implemented, reviewed and fixed. One pass over the text this task added or changed, nothing else. Uncommitted changes from before the run, listed in `preflight.md`, are not this task's. Behaviour stays exactly as it is.

Comments: remove the ones added by this task that restate what the name, the type or the next line already says. Keep a comment only where it carries intent, a constraint or a trade-off a reader could not recover from the code. Also remove the ones that narrate this task or this cycle: what was added, changed or fixed, per which review or ticket. They go stale the moment the change lands. Keep the comments that existed before the task.

Text: names, messages, documentation, test titles, anything a human reads. Make it plain and exact. Cut filler, puffery, hedging, generic phrases and words that sound technical but say nothing. One idea per sentence. A sentence that could appear unchanged in any other project says nothing about this one. Write in the natural language the surrounding text uses. Public names stay as they are.

Then run the checks.

Write `polish.md`: what you removed or reworded, file by file, one line each, or `Nothing to change.`, and the Checks section.

`passed` is true only when every check ran and exited 0.

## Reply schema

```json
{
  "type": "object",
  "oneOf": [
    {
      "properties": {
        "status": { "const": "done" },
        "passed": { "type": "boolean" }
      },
      "required": ["status", "passed"],
      "additionalProperties": false
    },
    {
      "properties": {
        "status": { "enum": ["failed", "blocked"] },
        "reason": { "type": "string", "minLength": 1 }
      },
      "required": ["status", "reason"],
      "additionalProperties": false
    }
  ]
}
```
