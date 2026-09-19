---
name: engineering-insights
description: Reads the relevant module's INSIGHTS.md before any work starts in it, and captures non-obvious engineering lessons — a bug's real cause, a dead end, a workaround, a non-default convention, a library quirk — into it. Use proactively as the very first step of any task to load prior lessons for the module(s) in scope, right after solving something surprising, and at the end of a substantive session — but only when something new and non-trivial was actually learned. Also invoke explicitly via /engineering-insights for an end-of-session wrap-up. Trigger terms: insight, learning, gotcha, wrap-up, lessons learned, INSIGHTS.md.
---

## Start of every task

1. Identify which of `server/`, `client/`, `reviewer-core/`, `e2e/` the
   request touches, and **read that module's `INSIGHTS.md` before doing any
   work** (more than one if the task spans modules). Treat existing entries
   as high-confidence guidance from past sessions.

## Capturing a finding

2. Before writing anything, re-check the section you're about to add to —
   if an equivalent entry is already there, don't duplicate it, skip writing.
3. Otherwise **append** (never edit or overwrite) a bullet under the
   matching section (`What Works`, `What Doesn't Work`, `Codebase Patterns`,
   `Tool & Library Notes`, `Recurring Errors & Fixes`, `Open Questions`) —
   never at the repo root.
4. Cold-read test: name the concrete file/module/version, the failure mode,
   and the fix. If it'd be obvious to anyone reading the code, don't write it
   ("Promises can be tricky" — no; "Promise.all() on the ingest pipeline
   times out after 30 items — use allSettled() batched by 10" — yes).

## End of session

5. Only if this session produced something substantive and not already
   covered by an existing entry, add one dated bullet under `Session Notes`
   summarizing it. If nothing new or non-trivial came up, write nothing —
   staying silent is the correct outcome, not a shortcut to avoid.
