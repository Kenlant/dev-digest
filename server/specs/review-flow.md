# Spec — the review flow

Contract for running an AI review on a PR and reading the result back, end
to end. Backed by `modules/reviews/*`; verified by
`test/pulls-findings.it.test.ts`, `test/pulls-cost.it.test.ts`,
`test/integration.it.test.ts`.

## Trigger — `POST /pulls/:id/review`

Body is one of `{ agentId }` or `{ all: true }` (tolerant parse; missing
body is treated as `{}` and rejected by `resolveTargets` with
`invalid_run_request` if neither field is present).

For every target agent, **before** any LLM call:

1. Create an `agent_runs` row (`status: 'running'`) — its id IS the `run_id`
   returned to the caller and the id every later endpoint keys on.
2. Return `{ pr_id, runs: [{ run_id, agent_id, agent_name }], reviews: [] }`
   immediately. The actual review executes in the background
   (`ReviewRunExecutor.executeRuns`, fire-and-forget from the route).

Rate-limited to 10 requests/minute (this route alone) since each call can
fan out to several LLM calls.

## Background execution (per PR, shared across its queued agents)

1. Load the PR's unified diff **once** (`loadDiff`), shared by every queued
   agent this call. A diff-load failure fails every queued run in the batch
   with the same error (`failAll`).
2. Per agent, in order (failures are isolated — one agent failing does not
   stop the others):
   - Resolve the agent's `LLMProvider` via `container.llm(agent.provider)`.
   - If the agent has repo-intel enabled (`agent.repoIntel !== false`),
     best-effort build: a "callers of changed symbols" digest, a repo-map
     digest, and a "N of M files are top-5% most-depended-on" rank note.
     Each degrades to `undefined`/`''` on any repo-intel error — enrichment
     failures never fail the run.
   - Call `reviewPullRequest()` (`@devdigest/reviewer-core`) with the
     system prompt, diff, resolved LLM, strategy, and the digests above.
     This is the only LLM call in the whole flow.
   - Persist: `insertReview` (verdict/summary/score/model) then
     `insertFindings` for the **grounded** findings only (findings dropped
     by `reviewer-core`'s citation gate are never persisted).
   - `markReviewed(pull.id, pull.headSha)` — records which commit this
     review ran against, so the PR list can distinguish
     reviewed / needs_review (head moved since) / stale.
   - Compute `blockers = countBlockers(findings, agent.ciFailOn)` — a
     **deterministic** severity-threshold count, independent of the
     model's own verdict string.
   - `completeAgentRun(runId, { status: 'done', durationMs, tokensIn,
     tokensOut, findingsCount, grounding, score, blockers, costUsd })`.
   - Build and save one `RunTrace` document (config + stats + prompt
     assembly + tool calls + raw output + the run's full log buffer).
   - `runBus.complete(runId)` — unblocks any open SSE subscriber.
3. On failure or cancellation (`RunCancelledError`), `completeAgentRun` is
   still called with `status: 'failed'`/`'cancelled'`, the error message,
   and a trace built from whatever log events were buffered so far — a
   failed run is never left with no explanation in the UI.

## Reads

| Endpoint | Returns |
|---|---|
| `GET /pulls/:id/reviews` | Persisted reviews (+ their findings) for a PR, newest first — one entry per review run, each with its `findings: FindingRecord[]` |
| `GET /pulls/:id/runs` | All `agent_runs` rows for a PR (any status) — the Timeline's data source, includes failed/cancelled runs |
| `GET /pulls/:id/runs/active` | Only `status='running'` rows — the server-side source of truth for "is a review in flight", survives client reload |
| `GET /runs/:id/trace` | The single persisted `RunTrace` document for one run (404 if not yet saved) |
| `GET /runs/:id/events` | SSE stream of `RunEvent`s for one run — replays the buffered events first, then streams live, ends when the run completes |

## Cost accounting

- Per-run cost (`agent_runs.cost_usd`) is set once, in `completeAgentRun`,
  for **every** terminal status (`done`, `failed`, `cancelled`) — a
  partial run that burned tokens before failing still records that cost.
- The PR list's cumulative `total_cost_usd` (`GET /repos/:id/pulls`) sums
  `agent_runs.cost_usd` **only** over `status = 'done'` rows, grouped by
  PR. A PR whose only run failed shows an empty cost, not that failed
  run's partial spend — this is the one deliberate asymmetry between the
  per-run field and the cumulative field (see `INSIGHTS.md` for the bug
  this fixed). `SUM()` over an all-`NULL` group returns SQL `NULL`, mapped
  to `null` (not `0`) on the wire.

## Finding actions

`POST /findings/:id/accept` and `POST /findings/:id/dismiss` set
`accepted_at`/`dismissed_at` on the finding row (mutually exclusive:
accepting an already-dismissed finding clears the dismissal, and vice
versa — see `findings.ts`). These are the only two actions; there is no
"unaccept" — re-running `accept` on an accepted finding is idempotent.
