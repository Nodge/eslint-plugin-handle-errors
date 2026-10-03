# Checks

Run the checks in `<repo>`. Keep repository files unchanged.

Write `checks.md` with the Checks section only.

`passed` is true only when every check ran and exited 0. A check that could not run makes it false.

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
