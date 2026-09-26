# Constants, utils, types, config, barrels

Reference for [SKILL.md](./SKILL.md) R8–R11. Sources in [SOURCES.md](./SOURCES.md).

Scope note: arguments that are really about build/bundle performance are labelled `[PERF-ARG]` and
are **not** the primary justification for any rule here.

## Constants

### Placement · `[HOUSE]`, indirectly supported

**No global `src/constants.ts`.** No primary source states this verbatim. It rests on two sourced
rules:

- `[CONVENTION]` FSD: *"components, hooks, and types are bad segment names because they aren't that
  helpful"* — segments must describe **purpose**, which is the same argument that kills a generic
  `constants/` bucket.
- `[OPINION]` Dodds: *"Place code as close to where it's relevant as possible"*, justified by
  maintainability (separated things *"drift out of sync and become outdated more rapidly"*),
  applicability, and ease of use.

Corroborating fact: bulletproof-react's recommended tree contains **no `constants` folder at all** —
it has `config` = *"global configurations, exported env variables etc."*

The ladder:

| Consumers | Home |
|---|---|
| exactly one module | next to that module |
| one feature | `features/<domain>/config.ts` |
| genuinely app-wide | only if it is env config, a route constant, or i18n |

`[CONVENTION]` That last row is FSD's own Shared-layer list, verbatim: *"environment configuration,
route constants, and i18n setup"* — and *"Shared should contain no business logic at all."*

### Naming and `enum` · `[OFFICIAL]`

**Never a TypeScript `enum`.** This is the hardest mechanically checkable rule in the skill.

> *"In modern TypeScript, you may not need an enum when an object with `as const` could suffice."*
> — TypeScript Handbook, *Objects vs Enums*

Rationale, verbatim: *"it keeps your codebase aligned with the state of JavaScript, and when/if enums
are added to JavaScript then you can move to the additional syntax."*

```ts
const ODirection = { Up: 0, Down: 1 } as const
type Direction = typeof ODirection[keyof typeof ODirection]
```

`erasableSyntaxOnly` makes it a hard constraint, not a preference: the flag *"causes TypeScript to
error on most TypeScript-specific constructs that have runtime behavior"* — `enum`, namespaces with
runtime code, class parameter properties, `import =`/`export =`. Rationale: *"Node.js supports
running TypeScript files directly as of v23.6, but only TypeScript-specific syntax that does not have
runtime semantics are supported."* The docs recommend pairing it with `--verbatimModuleSyntax`.

`const enum` is separately hazardous: ambient const enums are *"fundamentally incompatible"* with
`isolatedModules`, and cross-version inlining causes *"surprising bugs, like taking the wrong
branches of `if` statements."*

`[HOUSE]` Casing: SCREAMING_SNAKE_CASE for module-level primitives; `as const` objects for enum-like
sets. **No official React/Next/TS doc mandates SCREAMING_SNAKE_CASE** — typescript-eslint's
`naming-convention` permits it but does not prescribe it.

## Utils vs lib vs helpers vs services

There is a *documented* vocabulary but not an industry-agreed one.

- `[CONVENTION]` FSD: `lib` = *"library code that other modules on this slice need"*. It has **no
  `utils` segment at all** — the name would fail the "describe purpose" test.
- `[CONVENTION]` bulletproof-react keeps both: `lib` = *"reusable libraries preconfigured for the
  application"*, `utils` = *"shared utility functions"*.
- `[OFFICIAL]` Next.js denies these names any framework meaning: *"their naming has no special
  framework significance"*.
- "helpers" has **no authoritative definition anywhere**. Ban the name.

`[HOUSE]` The reconciliation this skill prescribes:

| Folder | Holds | May import third-party |
|---|---|---|
| `lib/` | adapters and preconfigured wrappers — the API client, the query client, the auth SDK wrapper, `cn` | yes |
| `utils/` | pure, dependency-free functions | no |
| `model/` | domain rules, schemas, stores | domain only |
| `api/` | I/O | yes |
| `services/` | stateful or I/O-bearing objects with a public interface | yes |
| `helpers/` | **banned** | — |

Prefer FSD's stricter instinct where they disagree: **name the module by its domain**
(`format-currency.ts`, `date.ts`), never by its essence.

### The dunghill / junk-drawer anti-pattern · `[OPINION]`

Defined as *"having a lot of unrelated helper functions in a single file or class"*. Named harms:
poor discoverability leading to unknowing duplication, violated single responsibility, refactoring
risk from accidental coupling, vague naming, cumulative degradation, and *"Testing complexity —
Testing numerous unrelated functions requires diverse setup scenarios."*

The three prescribed fixes, verbatim: (1) *"Locate code near relevant features"*; (2) *"Create
focused utility files"*; (3) *"Develop service classes … for functionality with state, multiple
implementations, business logic, or external system communication."* Note the same article warns
that `/lib` itself *"often becomes a junk drawer."*

Corroborating failure mode on teams: *"you often end up with many commons/shared/helper files … many
of those files contain similar functions with duplication, because developers won't be aware of all
the small functions written by colleagues."*

**Checkable:** a file named exactly `utils.ts` / `helpers.ts` with **more than one unrelated export**
is a violation.

### The purity rule · `[HOUSE]` — weakest-sourced claim in this skill

A file under `utils/` must:

- (a) export only functions
- (b) import nothing from `react` / `next`
- (c) perform no `fetch` / `process.env` / `localStorage` access
- (d) be unit-testable with no mocks

Relocation on violation: React-coupled → `hooks/`; I/O → `api/`; domain rules → `model/`.

**No source states "utils must be pure and must not import React" verbatim.** It is assembled from
FSD's segment semantics (*"Shared should contain no business logic at all"*, I/O → `api`, business
rules → `model`) plus the testability argument above. Presented as synthesis, not citation.

## Types

- `[CONVENTION]` FSD is openly hostile to a `types` folder (same bad-segment-name rule). Domain
  types → `model` (*"schemas, interfaces, stores, and business logic"*); contract/DTO types → `api`
  (*"request functions, data types, mappers"*).
- `[CONVENTION]` bulletproof-react keeps a global `src/types` = *"shared types used across the
  application"* plus a per-feature `types`.

`[HOUSE]` Synthesis: **domain types next to the model that owns them; DTOs next to the fetcher that
produces them; a global `types/` restricted to cross-cutting primitives (`Brand`, `Nullable`,
`ApiError`) and nothing else.**

`import type`: `[OFFICIAL, tool]` typescript-eslint's `consistent-type-imports` *"allows transpilers
to drop imports without knowing the types of the dependencies"*. Its docs compare it with
`verbatimModuleSyntax` — the lint rule autofixes without failing the build; `verbatimModuleSyntax`
*"fails the `tsc` build"* — and caution *"against enabling both simultaneously to avoid duplicate
reports."* Prefer `verbatimModuleSyntax: true`: it is enforced by `tsc`, not just lint, and is the
recommended companion to `erasableSyntaxOnly`.

Sharing types with a server: `[OFFICIAL, tool]` a monorepo internal package. Turborepo's
"Just-in-Time Packages" export TypeScript directly with no build step; compiled packages split types
from runtime in `exports`. `[HOUSE]` Generating DTOs from OpenAPI/Zod is a reasonable practice but
**no source was found prescribing it** — do not present it as standard.

## Environment variables · `[OFFICIAL]` — a correctness rule

Next.js documents two silent failure modes that make scattered `process.env` an architectural
problem, not a style one:

1. **Dynamic lookups are not inlined.** Both of these yield `undefined` in the browser:
   ```ts
   const varName = 'NEXT_PUBLIC_ANALYTICS_ID'; setupAnalyticsService(process.env[varName])
   const env = process.env; setupAnalyticsService(env.NEXT_PUBLIC_ANALYTICS_ID)
   ```
2. **Build-time freezing.** *"After being built, your app will no longer respond to changes to these
   environment variables … all `NEXT_PUBLIC_` variables will be frozen with the value evaluated at
   build time."*

Other official facts worth knowing structurally:

- Non-`NEXT_PUBLIC_` vars *"are only available in the Node.js environment"*.
- Load order: `process.env` → `.env.$(NODE_ENV).local` → `.env.local` (skipped when `NODE_ENV=test`)
  → `.env.$(NODE_ENV)` → `.env`.
- **`/src` caveat:** *"Next.js will load the .env files **only** from the parent folder and **not**
  from the `/src` folder."*
- `.env.test` *"should be included in your repository"*; `.env*.local` should not.
- Runtime server env is available under dynamic rendering via `await connection()`, *"allows you to
  use a singular Docker image that can be promoted through multiple environments"*.
- Outside the Next runtime (ORM configs, test runners): `@next/env`'s `loadEnvConfig(process.cwd())`.

### The rule · `[CONVENTION]`

**Exactly one module may reference `process.env`.** Everything else imports `env`.

```ts
import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: { DATABASE_URL: z.url() },
  client: { NEXT_PUBLIC_API_BASE: z.url() },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
  },
});
```

`runtimeEnv` must be destructured manually *"because only explicitly accessed variables are included
in the bundle"* — the same static-analysis constraint Next.js documents. T3 Env's server vars
*"will be undefined on the client, and attempting to access one will throw a descriptive error"*.

`[OFFICIAL]` Under the DAL pattern the rule is stricter still: *"only the Data Access Layer should
access `process.env`."*

`[HOUSE]` **Enforcement caveat:** `no-restricted-imports` **cannot** catch `process.env` — it is not
an import. That needs `no-restricted-syntax` / `no-restricted-properties`, and no published config
snippet was found. Treat it as to-be-written.

`[HOUSE]` Treat adding a `NEXT_PUBLIC_` prefix as a **publication decision**: the value is written
into the public bundle forever for that build.

## Barrel files (`index.ts`) — a genuine standoff

### Pro · `[CONVENTION]` FSD

A public API is *"a contract between a group of modules, like a slice, and the code that uses it. It
also acts as a gate, only allowing access to certain objects."* Three goals: protect the app from
structural changes inside the slice; make behavioral breaks require a public-API change; expose only
what is necessary.

FSD also bans wildcard re-exports: `export * from './ui/Comment'` *"hurts discoverability and may
expose internal implementation details."*

### Against · `[CONVENTION]` + `[OPINION]`

bulletproof-react reversed its own earlier advice: *"In the past, it was recommended to use barrel
files… However, it can cause issues for Vite to do tree shaking… Therefore, it is recommended to
import the files directly."* `[PERF-ARG]`

TkDodo's three arguments:

1. **Circular imports** *(the architecture argument)* — *"if we do what we always do — importing from
   the barrel file — we will create a circular import"*, which bundlers can crash on *"with cryptic
   error messages"*. Editor auto-import makes this accidental.
2. `[PERF-ARG]` Dev speed — one project went from ~11k modules to ~3.5k after removing internal
   barrels. (Single-project anecdote, not a benchmark.)
3. `[PERF-ARG]` `optimizePackageImports` *"cannot optimize once any non-export code appears in the
   file."*

His scoped exemption: *"Where barrels are necessary is when you are writing a library… This is the
public interface of what consumers can use."*

### Resolution

The camps are less opposed than they look. **FSD concedes the same costs** and prescribes
mitigations: files *"shouldn't import from their own slice's index file, as this creates circular
dependency chains"*; monolithic `shared/ui` index files *"prevent effective bundler optimization"*
with the fix being separate index files per component; *"Many index files can slow development
servers on large projects."*

Everyone agrees on **"barrel at a real boundary, direct imports inside"**. The disagreement is only
whether an FSD *slice* counts as a real boundary.

**The rule:** one `index.ts` per published package or design-system boundary; hand-written **named**
re-exports only (no `export *`); never imported from inside its own directory; never created for
arbitrary folders like `components/` or `utils/`. Prefer `exports`-map subpaths over barrels for
monorepo packages — Turborepo's own internal-package docs show multiple entrypoints (`./button`,
`./card`) rather than a single barrel.

**Honest labelling:** the *architecture* argument against barrels is circular imports + hidden
coupling + accidental auto-imports. Everything about module counts, tree-shaking and dev-server
memory is `[PERF-ARG]` and must not be the primary justification in an architecture document.

Enforcement: `import/no-cycle`, `eslint-plugin-no-barrel-files`, `import/no-internal-modules`, or
`no-restricted-imports` with `patterns` (e.g. `["@/features/*/!(index)"]` to force slice public APIs).

## Design tokens and styles · `[OFFICIAL]` Tailwind 4

Tailwind 4 settles the "tokens in TS or CSS" question: **tokens are CSS variables declared with
`@theme`.**

- *"These low-level design decisions are often called design tokens, and in Tailwind projects you
  store those values in theme variables."*
- *"Theme variables aren't just CSS variables — they also instruct Tailwind to create new utility
  classes."* Use `@theme` for tokens that should generate utilities; `:root` for plain CSS variables
  that shouldn't.
- Namespaces are fixed: `--color-*`, `--font-*`, `--text-*`, `--spacing-*`, `--radius-*`, `--shadow-*`,
  `--breakpoint-*`, `--animate-*`, …
- Read tokens from JS as `var(--token)` — not by importing a TS token module.
- Aliasing one token to another requires `@theme inline`.

`[HOUSE]` A parallel TS token file is an active liability: a second source of truth that cannot
generate utilities and will drift. **Ban it.**

`[CONVENTION]` shadcn's `lib/utils.ts` holding `cn` is a good default **only because it holds exactly
one thing.** It is the most common seed of the junk-drawer anti-pattern. Checkable rule:
`lib/utils.ts` may export `cn` and nothing else. (Note the current shadcn docs show `cn` as
`export { cn } from "cn"` — a re-export of a standalone package — rather than the historical
`twMerge(clsx(inputs))` body. Verify before quoting the legacy form.)

Assets: `[CONVENTION]` a top-level `assets/` for app-wide static files plus a per-feature `assets/`
for feature-scoped ones.
