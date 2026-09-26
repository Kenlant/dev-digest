# Client UI architecture — Server/Client boundaries and data flow

How `@devdigest/web` splits Server vs Client Components, and how server
data reaches a component.

## Server/Client Component boundary

`app/layout.tsx` (`RootLayout`) is the one true Server Component: it's an
`async function`, has no `"use client"`, and does server-only work —
`getLocale()` / `getMessages()` (next-intl) before render, and injecting
the theme-no-flash `<script>` to avoid a flash of the wrong theme. It
wraps everything in `NextIntlClientProvider` (hydrates i18n messages into
the client tree) and `Providers` (the TanStack Query client).

Below that, two patterns coexist for `page.tsx` files:

- **Thin Server Component wrapper** — `agents/page.tsx`,
  `settings/[section]/page.tsx`: no `"use client"`, no logic, just
  `return <SomeView />` where `SomeView` (in `_components/`) does the
  actual client-side work. The route file itself never needs
  interactivity, so it stays a Server Component by default and the
  boundary moves one level down.
- **Client Component page** — `page.tsx` (home redirect),
  `onboarding/page.tsx`, `agents/[id]/page.tsx`,
  `repos/[repoId]/pulls/page.tsx`, `repos/[repoId]/pulls/[number]/page.tsx`:
  marked `"use client"` directly on the route file because the page itself
  reads `useSearchParams`/`useRouter` or owns `useState` for tab/query
  state, not just delegating to a child.

Neither pattern fetches on the server: there is no `fetch()` in a Server
Component here and no RSC data-fetching waterfall. Every page — Server or
Client wrapper alike — ends up rendering a `"use client"` component tree
that fetches through TanStack Query. The Server/Client split in this app
is about **where a route's own interactivity boundary starts**, not about
server-side data fetching.

## Data flow: hooks → api.ts → API

```
component  →  lib/hooks/<domain>.ts (useXyz())  →  lib/api.ts  →  NEXT_PUBLIC_API_BASE
              TanStack Query: cache, refetch,        one fetch
              invalidation, mutation state            wrapper
```

All server data goes through a `lib/hooks/<domain>.ts` hook — never a
direct `fetch` from a component. `lib/api.ts` owns the single fetch
wrapper and the `NEXT_PUBLIC_API_BASE` base URL (default
`http://localhost:3001`); it's the only file that knows the API's origin.
`ApiError` (thrown by `api.ts`) is what page-level error states
(`isError`/`error instanceof ApiError`) branch on.

Cross-page invalidation goes through `useQueryClient().invalidateQueries`
with the same query keys the hooks use (e.g. `["pr-active-runs", prId]`,
`["pr-runs", prId]`) — see `pulls/[number]/page.tsx`'s
`invalidateActiveRuns`/`invalidateRunHistory` for the pattern used after a
run starts or settles.

## The `vendor/ui` boundary

`@devdigest/ui` (`vendor/ui`) is this app's own design system, not a copy
of an external library. It has internal layers (`primitives/`, `kit/`,
`charts/`) but every consumer imports through the package's barrel
(`import { X } from "@devdigest/ui"`) — never
`import { X } from "@devdigest/ui/primitives/X"`. This is enforced by
convention, not a lint rule; see `src/vendor/ui/README.md` for the layer
breakdown.

## The `vendor/shared` drift risk

`client/src/vendor/shared` is a **manual, hand-copied** mirror of
`server/src/vendor/shared` (the canonical `@devdigest/shared` contracts).
There is no build step or CI check that keeps them in sync — changing a
Zod contract (e.g. adding a field to `PrMeta`) means editing both copies
by hand, in the same PR. See root `AGENTS.md`'s do-not-touch section.

## Colocated feature components

Feature logic sits in `_components/<Name>/` next to the page that owns
it (e.g. `pulls/[number]/_components/ReviewRunAccordion/`), each with its
own `<Name>.test.tsx`. Pages (`page.tsx`) stay thin regardless of which
Server/Client pattern above they use — the substantial code is always one
level down, in `_components/`.

See [`../specs/pages.md`](../specs/pages.md) for what each route actually
renders and which data it depends on.
