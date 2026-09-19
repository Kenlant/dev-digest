# Spec — routes and their data

What each route renders and which API data it depends on. Backed by the
`app/**/page.tsx` files and their colocated `_components/`; verified by
each component's `*.test.tsx` (mocked `fetch`) and by `../e2e`'s
`NN-name.flow.json` flows (real stack, no LLM).

## `/` — root redirect

`useRepos()` (`GET /repos`). Zero repos → `EmptyState` pointing at
`/onboarding`; one or more → `router.replace` to
`/repos/:firstRepoId/pulls`. No UI of its own beyond the loading/empty
states — see `e2e/specs/01-app-boot.flow.json`.

## `/repos/:repoId/pulls` — PR list

`usePulls(repoId)` (`GET /repos/:id/pulls`, returns `PrMeta[]`). Client-side
filter (`?status`, default `needs_review`) + search + sort (`newest`/
`oldest` by `updated_at`) — no server-side pagination or filtering.

Columns (`constants.ts` → `COLUMN_KEYS`, in order): **Pull Request**
(title + `#number`), **Author**, **Size** (S/M/L bucket from
additions+deletions, thresholds 100/400), **Score** (`CircularScore`,
`—` if never reviewed), **Findings** (`FindingsCell` — severity badges per
`PrFindingPreview[]`, hover popover, read-only), **Status** (derived
review status for open PRs: `needs_review`/`reviewed`/`stale`; GitHub's
own merge state for merged/closed), **Cost** (`RunCostBadge` over
`total_cost_usd`, cumulative across the PR's successful runs, empty when
none), **Updated** (relative time).

## `/repos/:repoId/pulls/:number` — PR detail

Resolves the route's `:number` to the PR's internal uuid via the (cached)
pulls list (`usePulls`), then `usePullDetail(prId)` (`GET /pulls/:id`).
Tab state lives in `?tab` (default `overview`); trace-drawer state in
`?trace` (a `run_id`, opens `RunTraceDrawer` as an overlay independent of
the active tab).

Three tabs:
- **`overview`** (`OverviewTab`) — the PR body/description.
- **`findings`**, labeled **"Agent runs"** in the UI (`FindingsTab`) — see
  below.
- **`diff`** (`DiffTab`) — file-by-file diff viewer; supports posting
  inline review comments when `pr.status === 'open'`.

### Agent runs tab (`tab=findings`)

Data: `usePrReviews(prId)` (`GET /pulls/:id/reviews` → `ReviewRecord[]`,
one per run, each carrying its own `findings`), `usePrRuns(prId)`
(`GET /pulls/:id/runs` → `RunSummary[]`, all runs incl. failed/cancelled —
the Timeline's source), `usePrActiveRuns(prId)` (`GET /pulls/:id/runs/active`,
polled — drives the live "Review in progress" banner and Cancel button).

Two sections, in this order:
1. **Timeline** — `RunHistory`, every run interleaved with the PR's
   commits (`pr.commits`), newest first. Each run tile shows its outcome
   badge, `FindingsCell` (severity icons, no click), score, cost
   (`RunCostMeta`), and buttons to open its trace or jump to its Review
   runs card below.
2. **Review runs** — one `ReviewRunAccordion` per review, newest first,
   collapsed except the first. Expanding a card shows its `VerdictBanner`,
   a `SeverityCounterBar` (severity pill counts + Critical/Warning/
   Suggestion filter buttons — filter state is local `useState` per card,
   not URL state, since each run needs to filter independently), and its
   `FindingsPanel` (the filtered `FindingCard`s, each with Accept/Dismiss).

Clicking an agent name in a Timeline tile scrolls to and expands that
run's Review-runs card (`onGoToReview` → `targetRunId`/`targetNonce` on
`ReviewRunAccordion`).

## `/agents` and `/agents/:id` — agent list and editor

`/agents` (`AgentsListView`) lists configured review agents; `/agents/:id`
opens one agent's editor (system prompt, model/provider, strategy,
`ciFailOn` gate, repo-intel toggle). Both are thin `page.tsx` wrappers
around a `_components/` view.

## `/settings/:section` — settings

Thin Server Component wrapper (`SettingsView`) around section panels
(secrets/keys, workspace, etc.) keyed by the `:section` route param.

## `/onboarding` — add a repository

`AddRepoView` — the flow for importing a new repo (owner/name, GitHub
token check) before it appears in the repo switcher / `/` redirect target.
