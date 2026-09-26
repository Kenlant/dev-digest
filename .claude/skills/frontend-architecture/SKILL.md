---
name: frontend-architecture
description: "Directive rules for where frontend code lives: folder structure, component placement and splitting, constants, utils/lib/helpers, types, env config, barrel files, and which layer owns business logic. Use when creating a new component/hook/module, deciding where a file belongs, naming a folder, reviewing structure, or refactoring a growing feature in a React 19 / Next.js App Router codebase. Complements react-best-practices (code-level) and next-best-practices (framework mechanics)."
---

# Frontend Architecture

Where code lives, and why. Architecture and maintainability only — not runtime performance.

## Scope boundary (do not duplicate sibling skills)

| Question | Skill |
|---|---|
| **Where does this file go? How do I split it? Who owns this logic?** | **this skill** |
| Is this hook/component written correctly? Is this an anti-pattern? | `react-best-practices` |
| How does this Next.js API/file convention work? | `next-best-practices` |

## How to read a rule

Every rule carries a severity and an authority tier. **The tier is not decoration** — authority on
this topic is very unevenly distributed. File-level React rules and the RSC boundary are officially
documented and quotable; folder layout, prop counts and line counts are documented by *nobody*
official.

- Severity: `CRITICAL` (causes bugs or structural rot) · `HIGH` (won't scale) · `MEDIUM` (hurts DX)
- Authority:
  - `[OFFICIAL]` — react.dev, nextjs.org, typescriptlang.org, tanstack.com, redux.js.org, tailwindcss.com
  - `[CONVENTION]` — bulletproof-react (35.9k★), Feature-Sliced Design, shadcn/ui
  - `[OPINION]` — a named practitioner (Dodds, TkDodo, Makarevich)
  - `[HOUSE]` — our call. No external source states it. Stated anyway, so the rule is actionable.

Every URL cited in this skill appears in [SOURCES.md](./SOURCES.md) with its date and tier.

---

## The default architecture

One directive answer. Feature-first, adapted to the App Router. This is the shape to create and the
shape to refactor toward.

```
src/
  app/                        # ROUTING ONLY — no domain code lives here
    (marketing)/              # route groups split layouts, not features
    repos/[repoId]/
      page.tsx                # thin: params → validate → render one feature component
      _components/            # route-only UI (used by exactly THIS route)
      _lib/                   # route-only helpers
    layout.tsx
    provider.tsx              # all client providers isolated in one "use client" file
  features/<domain>/          # the primary unit of the codebase
    api/                      # fetchers + schemas + queryOptions + use<Thing>() hooks
    components/               # feature UI (used by 2+ routes, or encodes domain meaning)
    hooks/                    # feature hooks that actually call hooks
    model/                    # domain rules as pure functions; stores; domain types
    config.ts                 # feature-scoped constants
  components/ui/              # the design system. The ONLY place raw primitives are imported
  lib/                        # preconfigured wrappers around third-party/platform code
  hooks/                      # genuinely app-wide hooks
  types/                      # ONLY cross-cutting primitives (Brand, Nullable, ApiError)
  env.ts                      # the ONE module allowed to read process.env
```

`[OFFICIAL]` Next.js is explicitly **"unopinionated about how you organize and colocate your
project files"** and sanctions three strategies. This skill picks **strategy 1** — `app/` kept
"purely for routing purposes" — because it is the only one of the three compatible with both
bulletproof-react and FSD. Strategy 3 ("split project files by feature or route" *inside* `app/`)
is officially sanctioned but conflicts with both, because it scatters shared domain code across
route segments. Choosing here is our call, not a violation of official guidance.

`[CONVENTION]` The top-level `features/` + route-local `_components/` hybrid is not invented:
bulletproof-react's own Next.js App Router app uses **both at once** — `src/features/discussions/{api,components}`
for reusable domain code, `src/app/app/_components/` for route-only UI.

---

## Where does X go? — the decision table

The fast answer to the questions this skill exists for.

| You are writing… | It goes… | Rule |
|---|---|---|
| A component used by **exactly one route** | `app/<segment>/_components/` | R1 |
| A component used by **2+ routes**, or that encodes domain meaning | `features/<domain>/components/` | R1 |
| A component with **no domain meaning at all** (Button, Dialog, Table) | `components/ui/` | R1, R7 |
| A **pure calculation / formatter / validator** | a domain-named module in `features/<domain>/model/` or `lib/` — **never** a hook | R4 |
| A function that **calls hooks** | `features/<domain>/hooks/` or colocated with its component | R4 |
| A **fetch / mutation** | `features/<domain>/api/` — never in a component body | R5 |
| A **business rule** (pricing, eligibility, state transition) | a pure function in `features/<domain>/model/` | R6 |
| A **constant used by one module** | next to that module | R8 |
| A **constant used by one feature** | `features/<domain>/config.ts` | R8 |
| A **route constant / i18n key / env value** | `lib/routes.ts`, `messages/`, `env.ts` | R8 |
| A **wrapper around a third-party lib** (query client, API client, `cn`) | `lib/` | R9 |
| A **domain type** | next to the model that owns it | R10 |
| An **API request/response type** | next to the fetcher in `features/<domain>/api/` | R10 |
| **`process.env`** | `env.ts`. Nowhere else. | R11 |
| A **design token** | `@theme` in CSS. Never a parallel TS token file. | R12 |
| An **`index.ts` barrel** | only at a real package boundary. Not in feature folders. | R13 |
| A **test** | colocated `<Name>.test.tsx` next to the component | R14 |

---

## The eleven core rules

### R1 — Promotion, not prediction · HIGH · `[CONVENTION]` + `[HOUSE]`

A component is **born** in the narrowest scope that uses it and is **promoted** only when a second
consumer appears. Never start a component in `components/` because it "might be reused".

`app/<segment>/_components/` → `features/<domain>/components/` → `components/ui/`

`[HOUSE]` The "second consumer" trigger is our formulation. No primary source states a "rule of
three" or a "used by 2+ features" threshold for React — it is inherited from Fowler's *Refactoring*.
What *is* sourced is the mechanism that forces it: bulletproof-react bans cross-feature imports, so
the only legal way for feature B to use feature A's component is to move it up.

`[OPINION]` Makarevich: *"always start implementation from the top"*, *"extract components only when
there is an actual need for it"* — *"Any attempt to think in advance or start bottom-up from small
re-usable components always ends up either in over-complicated components API or in components
missing half of the necessary functionality."*

See [components.md](./components.md).

### R2 — Imports flow one way · CRITICAL · `[CONVENTION]`

`shared → features → app`. Features may not import from `app/`. Shared code may not import from
`features/` or `app/`. **No feature imports another feature** — compose them at the app level.

This is the load-bearing rule of the whole architecture, and it is the one rule that is mechanically
enforceable. Copy-pasteable `import/no-restricted-paths` config in [structure.md](./structure.md).

### R3 — `app/` is routing, `page.tsx` is thin · HIGH · `[OFFICIAL]` mechanism / `[HOUSE]` limit

`[OFFICIAL]` A route "is **not publicly accessible** until a `page.js` or `route.js` file is added",
so any file can be colocated inside `app/` safely. `_folder` opts a folder "and all its subfolders"
out of routing.

`[HOUSE]` No official source states a size limit for `page.tsx`. Our rule: **`page.tsx` = await
params/searchParams → validate → call the data layer → render one feature component + metadata.**
Any JSX beyond composition moves to `_components/` or `features/`.

`[HOUSE]` Any folder inside `app/` that is not a route segment must be `_`-prefixed or `()`-wrapped,
so routability is lexically obvious — the official rationale for `_folder` includes "avoiding
potential naming conflicts with future Next.js file conventions".

See [nextjs-app-router.md](./nextjs-app-router.md).

### R4 — A function is a hook only if it calls a hook · CRITICAL · `[OFFICIAL]`

The single most mechanically checkable layering rule in React, and it is quotable verbatim:

> **"No. Functions that don't *call* Hooks don't need to *be* Hooks."**
> — react.dev, *Reusing Logic with Custom Hooks*

react.dev's own example marks `useSorted(items)` 🔴 and `getSorted(items)` ✅. Also marked 🔴:
`useMount`, `useEffectOnce`, `useUpdateEffect`.

**Checkable:** a module exporting a `use*` function whose body contains no hook call is misfiled →
move it to `model/` or `lib/` as a plain function. The stated reason is architectural: *"This ensures
that your code can call this regular function anywhere, including conditions."*

Corollary, verbatim: *"Custom Hooks only share stateful logic, not state itself."* Two components
calling the same hook get two independent states — a hook is **not** a substitute for a store.

`[HOUSE]` Do not attribute "hooks are for React-specific logic" to React. react.dev never says it;
it is a community paraphrase of the rule above.

### R5 — Server state is not client state · HIGH · `[OFFICIAL]`

`[OFFICIAL]` TanStack Query defines server state by four properties: persisted remotely, requires
async APIs, **shared ownership**, goes stale. A general-purpose store is the wrong tool for it.

`[OFFICIAL]` In v5 a query's key and fetcher live in a `queryOptions()` factory, which keeps them
*"co-located to one another"* and feeds `useQuery` / `useSuspenseQuery` / `useQueries` / prefetch
alike. **Hand-rolled query-key factories are pre-v5 legacy.**

`[OPINION]` TkDodo (a TanStack maintainer): *"resist the urge to sync server data to a different
state manager"* — copying `useQuery` data into `useState` stops background updates reaching the UI.

See [business-logic.md](./business-logic.md) for the full client-state decision ladder.

### R6 — Business logic is a pure function, then a layer · HIGH · `[CONVENTION]`/`[OFFICIAL]`

The ladder: **plain pure function → custom hook (only if it calls hooks) → feature `api/` module →
server-side DAL.**

`[CONVENTION]` FSD names the segment explicitly: `model` = *"the data model: schemas, interfaces,
stores, and business logic."* Domain rules are **not** `lib`, and **not** `utils`. `lib` is
*"library code that other modules on this slice need"*; I/O belongs in `api`.

`[OFFICIAL]` The one officially-recommended business-logic layer found anywhere in this research is
Next.js's Data Access Layer: *"We recommend creating a DAL to centralize your data requests and
authorization logic."* It is `import 'server-only'`, and *"prevents developers from forgetting to
check that the user is authorized."*

`[HOUSE]` "No business rules inline in JSX." react.dev actually *endorses* computing derived values
during render, so the rule is not "no logic in the component file" — it is **"no named domain rule
inline in JSX; extract it to a pure function in `model/` and call it."**

### R7 — Only the design system touches raw primitives · HIGH · `[CONVENTION]`

`[CONVENTION]` shadcn/ui: *"This is not a component library. It is how you build your component
library."* You own the code.

`[CONVENTION]` bulletproof-react: wrap third-party components *"in order to adapt them to the
application's needs."*

`[CONVENTION]` FSD draws the line precisely: shared UI *"should not contain business logic, but it's
okay for them to be business-themed."* A `<PriceTag/>` may live in the design system; a
`<CheckoutPriceTag/>` that reads the cart store may not.

`[HOUSE]` Enforce with `no-restricted-imports` on `@radix-ui/*`, `@mui/*` etc. everywhere except
`components/ui/**`. Snippet in [structure.md](./structure.md).

### R8 — Constants are colocated, never pooled · MEDIUM · `[HOUSE]` (indirectly supported)

**No global `src/constants.ts`.**

`[HOUSE]` No primary source states this verbatim. It follows from two sourced rules: FSD's
*"components, hooks, and types are bad segment names because they aren't that helpful"* (segments
must describe *purpose*, which kills a generic bucket), and Dodds' *"Place code as close to where
it's relevant as possible."* Note also that bulletproof-react's recommended tree has **no
`constants` folder at all** — it has `config`.

Only three kinds of constant are eligible for app-wide scope, per FSD's Shared-layer list:
**environment configuration, route constants, i18n setup.**

`[OFFICIAL]` **Never a TS `enum`.** Use an `as const` object. The TypeScript Handbook: *"In modern
TypeScript, you may not need an enum when an object with `as const` could suffice."* And
`erasableSyntaxOnly` bans `enum` outright for Node's type-stripping (v23.6+). This is the hardest
checkable rule in the whole skill.

See [constants-utils-config.md](./constants-utils-config.md).

### R9 — `lib` ≠ `utils` ≠ `helpers` · MEDIUM · `[HOUSE]` (reconciling two conventions)

| Folder | Holds | May import third-party? |
|---|---|---|
| `lib/` | preconfigured wrappers/adapters — API client, query client, `cn` | yes |
| `utils/` | pure, dependency-free functions | no |
| `model/` | domain rules, schemas, stores | domain only |
| `api/` | I/O | yes |
| `helpers/` | **banned as a name** | — |

`[HOUSE]` This vocabulary is a reconciliation, not a citation. FSD has no `utils` segment at all
(it would fail the "describe purpose" test); bulletproof-react keeps both `lib` = *"reusable
libraries preconfigured for the application"* and `utils` = *"shared utility functions"*. No source
defines "helpers" — it is the classic dunghill filename.

`[HOUSE]` Purity rule for `utils/`: exports only functions; imports nothing from `react`/`next`;
performs no `fetch` / `process.env` / `localStorage`; unit-testable with no mocks. **No source
states this verbatim** — it is assembled from FSD's segment semantics (I/O → `api`, business rules →
`model`, *"Shared should contain no business logic at all"*).

**Checkable:** a file named exactly `utils.ts` or `helpers.ts` with more than one unrelated export
is a violation. Name the module by its domain: `format-currency.ts`, `date.ts`.

### R10 — Types live next to what they describe · MEDIUM · `[CONVENTION]`

Domain types → next to the model. Request/response DTOs → next to the fetcher. A global `types/` is
restricted to genuinely cross-cutting primitives (`Brand`, `Nullable`, `ApiError`) **and nothing
else**. `[CONVENTION]` FSD is openly hostile to a `types` folder; bulletproof-react permits a small
one. Prefer `verbatimModuleSyntax: true` over `consistent-type-imports` — typescript-eslint
cautions against enabling both.

### R11 — One module reads `process.env` · CRITICAL · `[OFFICIAL]` mechanism

`[OFFICIAL]` This is a **correctness** rule, not a style preference. Next.js documents that
`NEXT_PUBLIC_*` is inlined at build time and that **dynamic lookups are not inlined** — both
`process.env[varName]` and `const env = process.env; env.NEXT_PUBLIC_X` silently yield `undefined`
in the browser. Values are also frozen at build time.

`[CONVENTION]` One validated `env.ts` (T3 Env `createEnv` + Zod) converts both silent failures into
a startup error. Everything else imports `env`.

`[CONVENTION]` Under the DAL pattern Next.js goes further: *"only the Data Access Layer should
access `process.env`."*

---

## Growth path — when to change architecture

`[HOUSE]` **No source of any authority gives a numeric migration trigger** — not files, LOC,
features or team size. The "20+ features" figure circulating in search results does not appear in the
FSD docs. Triggers here are therefore symptom-based.

| Stage | Adopt when | Source |
|---|---|---|
| Flat (`components/`, `lib/`) | starting out — `[OFFICIAL]` *"don't spend more than five minutes on choosing a file structure"* | React FAQ (legacy) |
| **Feature-based (the default above)** | `components/` holds files from more than one business domain, and a newcomer cannot tell which domain a file belongs to from its path | `[HOUSE]`, from Martin's "what does it scream" test |
| Feature-Sliced Design | the cross-feature-import ban starts being **violated or waived** — two features genuinely need a shared domain model. That is exactly the pressure FSD's `entities` layer relieves, and bulletproof-react has no answer for it. | `[HOUSE]` + FSD's own three questions |
| Monorepo package | **a second consumer application** exists — not codebase size. A package boundary buys one thing a folder cannot: `exports` is enforced by the module resolver, not by a linter that can be disabled per-line. | `[HOUSE]`, from Turborepo/Nx rationale |

`[OFFICIAL, FSD]` FSD's own migration questions: new team members struggle to become productive;
changes in one part break unrelated parts; adding functionality is hard because of how much you must
hold in your head. Counter-trigger: *"If the current architecture works, maybe it's not worth
changing."* And: *"Avoid switching to FSD against the will of your teammates, even if you are the lead."*

Note also that adopting FSD and adopting all seven layers are **different decisions** — the FSD docs
say most projects need only `shared`, `pages`, `app`.

---

## Reference files

| File | Covers |
|---|---|
| [structure.md](./structure.md) | folder architectures compared, FSD vs bulletproof-react, lint enforcement configs |
| [components.md](./components.md) | where a component lives, when to split, the composition ladder, RSC splitting |
| [business-logic.md](./business-logic.md) | the layering ladder, hooks vs plain functions, server/client state, DAL, Server Actions |
| [constants-utils-config.md](./constants-utils-config.md) | constants, utils/lib, types, env, barrels, path aliases, design tokens |
| [nextjs-app-router.md](./nextjs-app-router.md) | App Router structure, special files, RSC boundary placement, route groups, Route Handlers |
| [dev-digest.md](./dev-digest.md) | how these rules map onto `client/` in this repo, and the current gaps |
| [SOURCES.md](./SOURCES.md) | annotated bibliography — every URL, date and authority tier |

## Version note

Research was conducted against Next.js docs self-reporting **v16.3.6**; this repo is on **Next 15.1**.
Where the two differ the skill states the v15 form as current-for-this-repo and flags the v16 path:
notably `middleware.ts` is deprecated and renamed to **`proxy.ts`** in v16.0.0 (codemod:
`npx @next/codemod@canary middleware-to-proxy .`).
