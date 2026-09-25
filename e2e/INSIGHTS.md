# Insights — e2e (`@devdigest/e2e`)

Append-only log for `engineering-insights`. Add entries, never edit or delete
existing ones (append-only avoids merge conflicts). Once this file passes
~200 entries or a section gets crowded, split it into domain files (e.g.
`INSIGHTS-flows.md`) and point to them from here. Review monthly: prune stale
entries (code since refactored/removed), merge duplicates, and resolve any
two entries that contradict each other — an agent reading both will
otherwise guess. This file is a session-wrap-up draft, not verified truth:
spot-check it periodically.

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

- (2026-09-19) This suite's CLI vocabulary (`lib/assert.ts`, driven by
  `run.ts`) is click/text/url-based only — no confirmed hover primitive.
  `specs/08-pr-list-findings.flow.json` therefore only asserts the Findings
  column and reviewed row render; the hover-triggered popover content
  (severity-scoped finding previews) is covered instead by
  `client/src/app/repos/[repoId]/pulls/_components/FindingsCell/FindingsCell.test.tsx`,
  which simulates `mouseenter`/`mouseleave` directly. Don't try to force a
  hover assertion into a flow spec — defer it to the component test.

## Recurring Errors & Fixes

## Session Notes

### 2026-09-19
Extended `specs/04-pr-findings.flow.json` to also click-toggle the per-run
severity filter (`SeverityCounterBar`'s "Warning" button) and confirm it
narrows/restores `FindingsPanel`'s visible cards. Added
`specs/08-pr-list-findings.flow.json` for the new PR-list Findings column.

## Open Questions
