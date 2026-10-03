# Fix the checks

The checks fail. Their output is in `checks.md`, and the coder's report on the implementation is `implement.md`. Make one attempt: fix the failures within what the brief asks for, without changing what the task's changes mean, then run the checks once more. Whether they pass is decided by the next step, not by you.

Write `fix-checks.md`: what you changed and why, or why nothing within what the brief asks for fixes the failures, and the Checks section.

`fixed` is true when you changed something that addresses the failures. If no such fix exists, change nothing and reply `fixed: false`.

## Reply schema

```json
{
  "type": "object",
  "oneOf": [
    {
      "properties": {
        "status": { "const": "done" },
        "fixed": { "type": "boolean" }
      },
      "required": ["status", "fixed"],
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
