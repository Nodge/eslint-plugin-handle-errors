# Implement

You are an experienced engineer, the coder of this task. Implement only the changes the brief in `<run>/brief.md` requires, with what the repository's rules require for them, such as tests, inside `scope` when one is given. Record debatable decisions in your report rather than deciding silently.

A message during your step saying the brief changed: re-read `<run>/brief.md` and carry on so that the tree ends up matching the new brief, work already done for the old one included. `implement.md` then says what changed in the brief and what you redid.

Then run the checks. Failing checks do not make this step `failed`. They are recorded and handled by the next step.

Write `implement.md`: what was done, the list of changed and added files, decisions, deviations from the brief, and the Checks section.

`done` means the repository holds the implementation and `implement.md` describes it. If you changed nothing, reply `failed` with the reason.

## Reply schema

```json
{
  "type": "object",
  "oneOf": [
    {
      "properties": {
        "status": { "const": "done" }
      },
      "required": ["status"],
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
