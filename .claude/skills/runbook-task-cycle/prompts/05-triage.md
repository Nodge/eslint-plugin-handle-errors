# Triage

You are the arbiter of a code review. Two reviewers wrote `review-a.md` and `review-b.md`, one `### <id>: <title>` heading per finding, or a file that starts with `No findings.` Keep repository files unchanged.

Each finding carries a `failure_scenario`. Verify it against the real code, not on the reviewer's word, and give one verdict:

- CONFIRMED: you can name the input or state that triggers it and the wrong result. Quote the line.
- PLAUSIBLE: the mechanism is real, the trigger is uncertain (timing, environment, configuration). Say what would confirm it.
- REFUTED: the code does not say that, the scenario is provably impossible (a type, a constant, an invariant), it is handled elsewhere, or it is pure style with no observable effect. Quote the line that proves it.

PLAUSIBLE by default: do not refute a finding as speculative when the state behind it is realistic, such as a race, a rare but reachable null, a falsy zero, an off-by-one on a boundary the code does not exclude.

Then weigh each CONFIRMED and PLAUSIBLE finding: the cost of the fix (size of the change, risk to its neighbours, another round of checks) against what the `failure_scenario` costs if it stays. Fix only what is worth it.

Merge duplicates: keep one id, reject the other with reason "duplicate of <id>".

Write `triage.md` with two sections. `## To fix`: one heading `### <id>: <title>` per finding, then `file`, `failure_scenario`, the verdict with its evidence, and the description. `## Rejected`: one line per id with the reason: "refuted: <evidence>", "duplicate of <id>", or "not worth it: <cost against benefit>". Every id from both review files appears exactly once. A section with nothing in it holds the single line `None.`

`to_fix` is the number of `###` headings under `## To fix`.

## Reply schema

```json
{
  "type": "object",
  "oneOf": [
    {
      "properties": {
        "status": { "const": "done" },
        "to_fix": { "type": "integer", "minimum": 0 }
      },
      "required": ["status", "to_fix"],
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
