# `@devdigest/web` — client map

Next.js studio UI: import repos, browse PRs, run/read AI reviews, author
agents. See [`README.md`](README.md) for the full route map.

**Before working here, read [`INSIGHTS.md`](INSIGHTS.md)** — treat it as
high-confidence guidance from past sessions unless told otherwise.

## Stack

Next.js 15.1 (App Router) · React 19 · TanStack Query 5.62 (all data access) ·
Tailwind 4 · `next-intl` (messages in `messages/<locale>/*.json`) ·
`recharts` · `mermaid` · `react-markdown` · Vitest 2.1 + jsdom.

## Commands

`pnpm dev` (`:3000`) · `pnpm build` / `pnpm start` · `pnpm typecheck` ·
`pnpm lint` (ESLint, flat config in `eslint.config.js`; includes
`eslint-plugin-react-hooks`) · `pnpm test` (vitest + jsdom, `fetch` mocked —
no API needed).

## Map

- `app/**/page.tsx` — routes: `/`, `/repos/:repoId/pulls`, `/pulls/:number`,
  `/agents`, `/agents/:id`, `/settings/:section`, `/onboarding`
- `components/` — cross-cutting: `app-shell` (nav, breadcrumbs, `g`-then-key
  shortcuts), `diff-viewer`, `mermaid-diagram`, `page-shell`
- `lib/` — `api.ts` (API base + fetch), `hooks/` (one hook file per data
  need), `providers.tsx`, `theme.tsx`, `toast.tsx`, `types.ts`
- `vendor/ui` — `@devdigest/ui`, the design system itself (not a copy of
  anything external)
- `vendor/shared` — manual copy of server's shared contracts (see root
  `CLAUDE.md` do-not-touch note)

## Non-default conventions

- All server data flows through TanStack Query hooks in `lib/hooks/*` →
  `lib/api.ts`. Don't `fetch` directly from a component.
- `vendor/ui` is a real internal package boundary: **always** `import { X }
  from "@devdigest/ui"` (the barrel `index.ts`) — never reach into a layer
  file (`primitives/`, `kit/`, `charts/`) directly.
- `NEXT_PUBLIC_API_BASE` (default `http://localhost:3001`) is the only API
  entry point — it's baked into `lib/api.ts`, not scattered across components.
- Feature logic sits in colocated `_components/<Name>/` folders next to the
  page that owns them, each with its own `*.test.tsx`; pages stay thin.

## Naming conventions

- Routes: `app/**/page.tsx` per the Next.js App Router file convention;
  dynamic segments are `[param]` folders (`repos/[repoId]/pulls/[number]`).
- Feature components: PascalCase folder under the owning page's
  `_components/`, matching the component name, with a colocated
  `<Name>.test.tsx` (e.g. `_components/RunHistory/RunHistory.tsx` +
  `RunHistory.test.tsx`) — pages themselves stay thin.
- Hooks: one file per data domain in `lib/hooks/<domain>.ts`, exporting
  `use<Thing>()` (e.g. `reviews.ts` → `useCancelRun()`).
- `vendor/ui` (`@devdigest/ui`) primitives live under `primitives/`, `kit/`,
  `charts/` — always imported through the package's barrel `index.ts`, never
  by reaching into those layer folders directly.
- See root [`CLAUDE.md`](../CLAUDE.md#naming-conventions) for cross-package
  rules.

## Gotchas

- Component/interaction tests mock `fetch` — they need neither the real API
  nor a browser. Real browser journeys live in `../e2e`, not here.
- `vendor/shared` can silently drift from the server's copy — no CI check
  catches it (see root `CLAUDE.md`).

## Read when…

- Route map and stack details → [`README.md`](README.md)
- Server/Client boundaries, hooks→api.ts data flow → [`docs/ui-architecture.md`](docs/ui-architecture.md)
- Every route's data/behavior contract → [`specs/pages.md`](specs/pages.md)
- Design-system layers/usage → [`src/vendor/ui/README.md`](src/vendor/ui/README.md)

## End of session

Wrapping up a substantive session? Run `/engineering-insights` (or let it
auto-trigger) to update `INSIGHTS.md` — don't skip this step.
