# Insights — server (`@devdigest/api`)

Append-only log for `engineering-insights`. Add entries, never edit or delete
existing ones (append-only avoids merge conflicts). Once this file passes
~200 entries or a section gets crowded, split it into domain files (e.g.
`INSIGHTS-db.md`, `INSIGHTS-reviews.md`) and point to them from here. Review
monthly: prune stale entries (code since refactored/removed), merge
duplicates, and resolve any two entries that contradict each other — an
agent reading both will otherwise guess. This file is a session-wrap-up
draft, not verified truth: spot-check it periodically.

## What Works

## What Doesn't Work

## Codebase Patterns

- `ReviewRunExecutor` calls `this.repo.completeAgentRun(...)`, but `this.repo`
  is typed as `ReviewRepository` (`src/modules/reviews/repository.ts`), a
  thin wrapper class — its methods have their OWN parameter-type literal,
  separate from the actual implementation in
  `src/modules/reviews/repository/run.repo.ts`. Adding a field to
  `completeAgentRun`'s `values` type in `run.repo.ts` alone does nothing for
  callers; the same field must be added to `repository.ts`'s wrapper method
  too, or you get a confusing "property does not exist" error pointing at the
  wrong file. Grep for the method name in both files before assuming one edit
  is enough.
- Several places construct a `RunStats`/`RunTrace` object literal, not just
  `run-executor.ts`'s main success path: its own `traceFromBuffer` failure
  builder (~line 426), `test/contracts.test.ts`'s fixture, and the client's
  `RunTraceDrawer.test.tsx` fixture. Adding a non-optional field to `RunStats`
  breaks all of them at once — grep `tokens_in:` repo-wide (server + client)
  before adding a field there, not just the one call site you're editing.

## Tool & Library Notes

- Drizzle's `sum()` aggregate over a Postgres `doublePrecision` column comes
  back as a JS value that needs `Number(...)` — verified against a real
  Testcontainers Postgres (`test/pulls-cost.it.test.ts`), not just types.
  `SUM()` over a group where every row's value is `NULL` correctly returns
  SQL `NULL` (not `0`), which round-trips fine as long as the response mapper
  doesn't `?? 0` it away.

## Recurring Errors & Fixes

## Session Notes

### 2026-09-19
Added the Run Cost Badge feature (cost_usd on agent_runs, cumulative
total_cost_usd on the PR list, per-run cost_usd on RunSummary/RunStats).
Server-side cost was already fully computed in reviewer-core
(`ReviewOutcome.costUsd`) — the whole task was plumbing it through, not new
calculation logic.

## Open Questions
