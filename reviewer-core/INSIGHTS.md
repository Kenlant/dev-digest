# Insights — reviewer-core (`@devdigest/reviewer-core`)

Append-only log for `engineering-insights`. Add entries, never edit or delete
existing ones (append-only avoids merge conflicts). Once this file passes
~200 entries or a section gets crowded, split it into domain files (e.g.
`INSIGHTS-grounding.md`, `INSIGHTS-prompt.md`) and point to them from here.
Review monthly: prune stale entries (code since refactored/removed), merge
duplicates, and resolve any two entries that contradict each other — an
agent reading both will otherwise guess. This file is a session-wrap-up
draft, not verified truth: spot-check it periodically.

## What Works

## What Doesn't Work

## Codebase Patterns

- (2026-09-19) `OpenRouterProvider.completeStructured`
  (`src/llm/openrouter.ts:79-80`) spreads `session_id`/`usage: { include:
  true }` into the request body instead of declaring them as typed fields —
  a plain field would fail the SDK's excess-property check since the
  OpenAI-shaped request type doesn't know about OpenRouter-specific
  extensions; the spread bypasses that check. `usage: { include: true }`
  specifically asks OpenRouter to report the REAL per-call generation cost in
  `usage.cost`, which is what lets `ReviewOutcome.costUsd` be an actual
  dollar figure instead of a PriceBook estimate (see server/client
  INSIGHTS.md's 2026-09-19 cost-feature entry).

## Tool & Library Notes

- (2026-09-19) The Node OpenAI SDK's `chat.completions.create(body, options)`
  takes per-request options (including `timeout`) as a SEPARATE second
  argument, not a body field. `OpenRouterProvider` used to call `create(body)`
  with no second argument, so `req.timeoutMs` was silently ignored on every
  call — only the constructor-level default timeout ever applied. Fixed by
  passing `req.timeoutMs ? { timeout: req.timeoutMs } : undefined` as the
  second arg (`src/llm/openrouter.ts:82`). This was the second half of the
  "review run hangs 10+ minutes" bug below — the openai/anthropic adapters
  already honored a per-call timeout, only OpenRouter's didn't.

## Recurring Errors & Fixes

- (2026-09-19) **A review run hangs for 10-20+ minutes with no further log
  output.** Root cause and full fix are documented in `server/INSIGHTS.md`
  (same entry) — the short version: reasoning models spend part of their
  output budget on hidden "reasoning" tokens, so `completeStructured` needs
  an explicit `maxTokens` (`ReviewInput.maxTokens`, `src/review/run.ts:86`)
  or generation is unbounded and no client-side timeout ever fires because
  the request is genuinely still generating, not stalled.

## Session Notes

## Open Questions
