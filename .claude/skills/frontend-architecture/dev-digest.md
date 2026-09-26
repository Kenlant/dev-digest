# How these rules map onto `client/`

Repo-specific companion to [SKILL.md](./SKILL.md). Verified against the tree on 2026-09-25.

This file **documents** the current state and names the gaps. It does **not** authorize changing
`client/` — any refactor is a separate, explicitly-approved task.

See also `client/AGENTS.md` (the module map) and `client/docs/ui-architecture.md` (the
Server/Client boundary and data flow, in detail).

## Current shape

```
client/src/
  app/                          # routes + _components/ colocation
    agents/_components/AgentCard/
    settings/[section]/_components/SettingsView/
  components/                   # cross-cutting: app-shell, diff-viewer, page-shell, …
  lib/
    api.ts                      # the one fetch wrapper + NEXT_PUBLIC_API_BASE
    hooks/<domain>.ts           # all server data — TanStack Query
    types.ts                    # 49 lines, global
    providers.tsx theme.tsx toast.tsx repo-context.tsx
  vendor/ui/                    # @devdigest/ui — the design system
  vendor/shared/                # manual copy of server contracts (do not touch)
  i18n/request.ts  ·  messages/en/
```

Stack: Next 15.1 (App Router) · React 19 · TanStack Query 5.62 · Tailwind 4 · next-intl · Vitest.

## ✅ Already aligned

| Rule | How `client/` satisfies it |
|---|---|
| **R5** server state | All server data flows through `lib/hooks/<domain>.ts` → `lib/api.ts`. No direct `fetch` from a component. This is exactly the "single pre-configured API client + one hook per data need" convention. |
| **R11** `process.env` | Exactly **one** occurrence in the whole client: `src/lib/api.ts:6`. Nothing else reads it. |
| **R8** no TS `enum` | Zero `enum` declarations in `src/`. Already compliant with the hardest rule in the skill. |
| **R1** route-local UI | `_components/` folders sit next to the page that owns them, each with a colocated `*.test.tsx`. This is the officially-sanctioned private-folder convention and matches bulletproof-react's Next.js app. |
| **R3** thin pages | Thin Server-Component wrappers (`agents/page.tsx`, `settings/[section]/page.tsx`) delegate to a `_components/` view. Client pages exist only where the route itself owns `useSearchParams`/tab state. |
| **R7** design-system boundary | `vendor/ui` is a real internal package with its own barrel — imports go through `@devdigest/ui`, never into `primitives/`, `kit/`, `charts/`. |
| **R13** barrels at a boundary | `vendor/ui/index.ts` and `vendor/shared/index.ts` are exactly the case where a barrel is correct: a package public API. |
| path aliases | A single `@/*` plus two package aliases (`@devdigest/ui`, `@devdigest/shared`) — consistent with the "one short alias, distinct from `node_modules`" rule. |

## ⚠️ Gaps

Each is a real divergence, with the rule it diverges from. None is a bug today.

### 1. No `features/` layer — R2, R6

There is no home for domain code shared by two routes. Cross-page domain components
(`diff-viewer`, `run-cost-badge`, `repo-not-found`) currently land in `components/`, mixed with
genuinely cross-cutting chrome (`app-shell`, `page-shell`). That is the exact condition the growth
path names as the trigger for feature-based structure: *`components/` holds files from more than one
business domain, and a newcomer cannot tell which domain a file belongs to from its path.*

Domain rules also have no named home — `lib/feature-models.ts`, `lib/model-label.ts`,
`lib/github-urls.ts` are domain logic living in the shared layer, which R6/R9 place in
`features/<domain>/model/`.

### 2. Nothing enforces the boundaries — R2, R7

`eslint.config.js` runs `typescript-eslint` + `eslint-plugin-react-hooks` only. There is **no**
`import/no-restricted-paths`, no `eslint-plugin-boundaries`, no `dependency-cruiser`.

The `vendor/ui`-barrel-only rule is documented in `client/AGENTS.md` as a convention and is
**enforced by nothing**. Per R2, aliases are not enforcement — a path alias permits every illegal
import equally. The single highest-value change available here is the copy-pasteable
`import/no-restricted-paths` zone config in [structure.md](./structure.md).

### 3. Barrels inside app code — R13

`index.ts` files exist throughout `src/components/*/`, `src/app/**/_components/*/` and
`src/lib/hooks/`. Under R13 a barrel belongs only at a real package boundary (`vendor/ui`,
`vendor/shared`); inside app code it adds circular-import risk and hidden coupling via editor
auto-import.

Note the honest framing: the *architecture* argument is circular imports, not bundle size. This is
low-severity and not worth a sweeping refactor on its own — but new folders should not add barrels.

### 4. `env.ts` is unvalidated — R11

`NEXT_PUBLIC_API_BASE` is read once with a `??` fallback rather than validated. Zod is already a
dependency, so a validated `env.ts` (T3 Env style, or plain Zod) is cheap. Today a missing or
malformed value silently falls back to `http://localhost:3001` in a production build — and per the
official inlining rules it is frozen at build time.

### 5. Global `lib/types.ts` — R10

49 lines of shared types. R10 allows a global `types/` only for cross-cutting primitives; domain
types belong next to the model that owns them. Worth auditing which of the 49 lines are genuinely
cross-cutting.

### 6. `vendor/shared` drift — no CI check

Already flagged in the root `AGENTS.md`: the manual copy of the server's contracts can silently
diverge and nothing catches it. This is the monorepo-package trigger from the growth path — a second
consumer of the same contracts already exists, which is precisely when `exports`-enforced package
boundaries start earning their cost.

## If this repo adopts `features/`

The migration that fits the existing tree, in order — **not scheduled, just the shape**:

1. Add the `import/no-restricted-paths` unidirectional zones first, while there is nothing to
   violate them. Rules are cheap before the code exists and expensive after.
2. Create `src/features/<domain>/` for the domains the routes already imply: `repos`, `pulls`,
   `reviews`, `agents`.
3. Move `lib/hooks/<domain>.ts` → `features/<domain>/api/`, keeping `lib/api.ts` as the shared client.
4. Move domain components out of `components/` into their feature; leave only chrome
   (`app-shell`, `page-shell`) behind.
5. Move `lib/feature-models.ts`, `lib/model-label.ts` → the owning feature's `model/`.
6. Leave `vendor/ui` exactly as it is — it is already the design-system boundary this architecture
   wants.

Per the FSD migration guidance this can happen incrementally and *"will not halt the development of
new features"*. And per the same source: don't do it against the team's will.

## Version note

This repo is on **Next 15.1**, so `middleware.ts` (if ever added) is still the correct convention —
there is no middleware/proxy file today. The v16 rename to `proxy.ts` is the forward path. `next-intl`
config lives in `src/i18n/request.ts` with messages in `messages/en/` — a per-locale folder rather
than next-intl's documented single `messages/<locale>.json`, which is fine since the library is
*"agnostic to how you store messages"*.
