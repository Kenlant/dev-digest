# Insights — client (`@devdigest/web`)

Append-only log for `engineering-insights`. Add entries, never edit or delete
existing ones (append-only avoids merge conflicts). Once this file passes
~200 entries or a section gets crowded, split it into domain files (e.g.
`INSIGHTS-app-shell.md`, `INSIGHTS-hooks.md`) and point to them from here.
Review monthly: prune stale entries (code since refactored/removed), merge
duplicates, and resolve any two entries that contradict each other — an
agent reading both will otherwise guess. This file is a session-wrap-up
draft, not verified truth: spot-check it periodically.

## What Works

## What Doesn't Work

## Codebase Patterns

- `client/src/components/<name>/` follows kebab-case-dir + PascalCase-file +
  barrel `index.ts` (e.g. `mermaid-diagram/MermaidDiagram.tsx`,
  `repo-not-found/RepoNotFound.tsx`). Always import from the folder
  (`@/components/foo`), never the file directly — an `index.ts` re-export is
  expected even for a brand-new component.
- (2026-09-19) `pulls/_components/FindingsCell/FindingsCell.tsx:62`
  (`FindingsCell`, built for the PR list's Findings column: compact
  `SeverityBadge`s + a hover popover previewing that severity's findings,
  read-only) is reusable as-is anywhere else a `PrFindingPreview[]` needs the
  same read-only severity+hover treatment — it was reused directly at
  `pulls/[number]/_components/RunHistory/RunHistory.tsx:159` for the Timeline
  tiles' findings badges (`RunSummary.findings`, same `PrFindingPreview[]`
  shape) instead of building a second bespoke badge/popover component. Check
  for a `PrFindingPreview[]`-shaped prop before writing a new severity-badge
  component.
- (2026-09-19) Not every per-page filter belongs in the URL query string. The
  PR detail page's `tab`/`trace` state IS in `?query` (`page.tsx`), but
  `pulls/[number]/_components/ReviewRunAccordion/ReviewRunAccordion.tsx:47`'s
  severity filter is deliberately local `useState` — a PR can have many
  review runs, each needs to filter independently, and a single shared
  `?severity=` param can't represent "run A filtered to CRITICAL, run B
  unfiltered" at the same time. Default to URL state only when the filter is
  truly page-wide/shareable; per-item filters inside a list of repeated
  components stay local.

## Tool & Library Notes

- `Number.prototype.toPrecision(n)` keeps trailing zeros as a STRING
  ("0.06".toPrecision-style rounding of `0.06` → `"0.060"`), which reads
  wrong in a UI. Round-trip through `Number(x.toPrecision(n))` then
  `String(...)` to drop the insignificant zero back to `"0.06"` — used in
  `run-cost-badge/RunCostBadge.tsx`'s adaptive-precision `formatCost`.

## Recurring Errors & Fixes

## Session Notes

### 2026-09-19
Added the Run Cost Badge feature: new `run-cost-badge` shared component
(`formatCost`/`RunCostBadge`/`RunCostMeta`) used in the PR-list Cost column,
RunHistory's per-run meta line, and RunTraceDrawer's stats tile. `RunStats`/
`RunSummary` gained `cost_usd`; `PrMeta` gained `total_cost_usd` (cumulative,
deliberately a different name from the per-run field — see server INSIGHTS.md
for the naming rationale).

## Open Questions
