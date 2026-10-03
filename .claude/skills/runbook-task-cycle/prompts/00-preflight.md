# Preflight

Run `git status --porcelain -- . ':(exclude).agent-runbooks'` in `<repo>`, or the status command the VCS section of the profile gives. Keep repository files unchanged.

Write `preflight.md`: the command, its exit code, stdout and stderr. A non-zero exit code is `failed` with the reason, `<repo>` not being a repository included.

`clean` is true when the output lists nothing outside `.agent-runbooks/`: no changed, staged or untracked files.

## Reply schema

```json
{
  "type": "object",
  "oneOf": [
    {
      "properties": {
        "status": { "const": "done" },
        "clean": { "type": "boolean" }
      },
      "required": ["status", "clean"],
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
