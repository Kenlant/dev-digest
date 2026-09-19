# Spec — citation grounding and scoring contract

The mechanical gate every diff-finding must pass before it reaches a user,
and the scoring rule derived from what survives it. Backed by
`grounding.ts` and `review/reduce.ts`; verified by the package's own unit
tests (hermetic, stubbed `LLMProvider`).

## Grounding rule (`groundFindings`)

A finding is **kept** only if it satisfies one of:

1. **Full-file kinds** (`finding.kind` in `secret_leak`, `lethal_trifecta`,
   `phantom`, `hook`) — kept as long as `finding.file` is one of the files
   present in the diff. These come from full-file scanners, not a specific
   diff hunk, so they aren't checked against a line range.
2. **Everything else** (line-anchored findings) — kept only if
   `[finding.start_line, finding.end_line]` intersects at least one
   new-side line number covered by a real hunk in `finding.file`'s diff.

A finding is **dropped**, with a reason string, when:
- `finding.file` is not one of the files present in the diff at all, or
- (non-full-file) its line range does not intersect any hunk in that
  file's diff — the model cited a line that isn't actually part of the
  change.

This is the **only** post-processing step in `reviewPullRequest()` and it
runs exactly once, after `reduceReviews()` — identically for single-pass
and map-reduce output. There is no per-strategy grounding variant.

## Grounding summary string

`groundingSummary()` produces `"<kept>/<kept+dropped> passed"` (e.g.
`"3/4 passed"`). This exact string is what's persisted as
`RunTrace.stats.grounding` and shown as the badge next to the Stats
section in the trace drawer — it is not reformatted or recomputed
downstream.

## Scoring contract (`scoreFromFindings`)

The score shown anywhere in the product is **never** the model's
self-reported number. It is recomputed, deterministically, from the
findings that survived grounding:

```
score = clamp(100 - Σ penalty(finding.severity), 0, 100)
penalty: CRITICAL = 35, WARNING = 12, SUGGESTION = 3
```

So: 0 findings → 100, one `SUGGESTION` → 97, one `WARNING` → 88, one
`CRITICAL` → 65. This guarantees the number on screen can never contradict
the findings list beneath it (a model that "approves" while listing five
criticals cannot show a 95).

## Reduce contract (map-reduce only; `reduceReviews`)

When more than one chunk was reviewed (map-reduce mode):
- **Findings**: concatenated from every chunk, unfiltered (grounding runs
  once on the concatenated set afterward, not per chunk).
- **Verdict**: the worst of all chunk verdicts wins
  (`request_changes` > `comment` > `approve`).
- **Score**: the mean of the chunks' own (pre-grounding) scores — this
  intermediate value is immediately discarded and replaced by
  `scoreFromFindings()` on the grounded findings; it never reaches the UI.
- **Summary**: each chunk's non-empty summary joined with a space.

Single-pass mode has exactly one partial, so `reduceReviews` short-circuits
and returns it unchanged — the merge rules above only matter for
multi-chunk (map-reduce) reviews.
