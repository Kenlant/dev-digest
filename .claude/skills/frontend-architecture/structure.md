# Folder structure

Reference for [SKILL.md](./SKILL.md) R1–R3. Sources and tiers in [SOURCES.md](./SOURCES.md).

## The two conventions worth knowing

Neither is a standard. Both are convention-tier. React and Next.js officially decline to prescribe
a folder architecture at all — `[OFFICIAL]` *"don't spend more than five minutes on choosing a file
structure"* (React FAQ) and *"choose a strategy that works for you and your team and be consistent"*
(Next.js).

### bulletproof-react — the default this skill prescribes

`[CONVENTION]` 35.9k★, single maintainer, a repo of guidance rather than a spec.

```
src/
  app/          # routes, provider.tsx, router config
  assets/
  components/   # shared components used across the entire application
  config/       # global configuration, exported env variables
  features/     # feature based modules
  hooks/        # shared hooks
  lib/          # reusable libraries preconfigured for the application
  stores/       # global state stores
  testing/      # test utilities and mocks
  types/        # shared types
  utils/        # shared utility functions
```

Feature anatomy — *"You don't need all of these folders for every feature. Only include the ones
that are necessary for the feature."*

```
src/features/awesome-feature/
  api/          # request declarations and api hooks for this feature
  assets/
  components/
  hooks/
  stores/
  types/
  utils/
```

Note the shape: **feature-based at the top, type-based inside a feature.**

Its two hard rules:

1. *"It might not be a good idea to import across the features. Instead, compose different features
   at the application level."*
2. *"the code should flow in one direction, from shared parts of the code to the application
   (shared -> features -> app)."*

### Feature-Sliced Design — the escalation target

`[CONVENTION]` A formal methodology: **layers → slices → segments.**

Layers, top to bottom: `app` → `processes` (deprecated) → `pages` → `widgets` → `features` →
`entities` → `shared`.

The import rule, verbatim: *"A module (file) in a slice can only import other slices when they are
located on layers strictly below."* And: *"Slices cannot use other slices on the same layer."*

The five standard segments:

| Segment | Holds |
|---|---|
| `ui` | UI components, date formatters, styles |
| `api` | backend interactions: request functions, data types, mappers |
| `model` | the data model: schemas, interfaces, stores, **and business logic** |
| `lib` | library code that other modules *in the same slice* need |
| `config` | configuration files and feature flags |

FSD's own minimalism rule matters as much as its maximalism: *"Don't add layers unless they bring
project value"* — most projects need only **Shared, Pages, App**.

Its `entities` layer is the thing bulletproof-react lacks: a home for a domain model shared by two
features. That is the concrete reason to migrate (see the growth path in SKILL.md).

### Atomic Design — legitimate only inside the design system

`[OPINION]` Brad Frost defined it as *"a mental model to help us think of our user interfaces as
both a cohesive whole and a collection of parts"* — **not** a folder structure. Criticizing
atomic-design-as-folder-structure is not a criticism of Frost; it is a criticism of a misapplication
his source material never prescribed.

`[CONVENTION]` FSD names its failure mode when applied app-wide: it *"struggles with business logic
placement, causing it to scatter across components."* The two combine cleanly — atoms/molecules
belong in `shared/ui` (here: `components/ui/`), never as the top-level split of an application,
because it classifies by *visual composition depth* rather than by *domain*.

Evidence honesty: no authoritative, named-author 2025/2026 retrospective criticizing whole-app
Atomic Design was found. The available criticism is FSD's own competitive framing plus low-authority
blogs.

## Screaming architecture — the naming test

`[OPINION]` Robert C. Martin, 2011 (backend origin, pre-dates React entirely):

> *"When you look at the top level directory structure, and the source files in the highest level
> package; do they scream: Health Care System, or Accounting System, or Inventory Management System?
> Or do they scream: Rails, or Spring/Hibernate, or ASP?"*

Applied here: **folders are named after the business, not after the framework.** `features/reviews/`,
not `features/tables/`. This is the same move FSD encodes in its slice-naming rule, and the same
move Next.js makes when it says folder naming *"has no special framework significance"*.

## Enforcement — four tiers

Aliases are **not** enforcement. A path alias makes imports refactor-proof but permits every illegal
import equally. Only these create boundaries.

### Tier 1 — `import/no-restricted-paths` (lowest setup cost, what bulletproof-react documents)

Unidirectional layering — copy this first:

```js
'import/no-restricted-paths': [
  'error',
  { zones: [
      // e.g. src/app can import from src/features but not the other way around
      { target: './src/features', from: './src/app' },
      // src/features and src/app can import from shared modules but not the reverse
      { target: ['./src/components','./src/hooks','./src/lib','./src/types','./src/utils'],
        from:   ['./src/features','./src/app'] },
  ] },
],
```

Cross-feature ban — note this is **O(n) hand-maintained zones**, one per feature:

```js
'import/no-restricted-paths': [
  'error',
  { zones: [
      { target: './src/features/auth',        from: './src/features', except: ['./auth'] },
      { target: './src/features/comments',    from: './src/features', except: ['./comments'] },
      { target: './src/features/discussions', from: './src/features', except: ['./discussions'] },
      // one entry per feature…
  ] },
],
```

Zone options: `target` (dir, glob, or array), `from` (forbidden sources), `except`, `message`,
plus a top-level `basePath`.

### Tier 2 — `eslint-plugin-boundaries` (when the O(n) zones stop scaling)

Classifies files into typed elements, then applies policies. Maps almost 1:1 onto FSD:
`boundaries/element-types` for the layer order, `boundaries/entry-point` for the public-API rule.

```js
settings: {
  "boundaries/elements": [
    { type: "shared",  pattern: "src/{components,hooks,lib,types,utils}/*" },
    { type: "feature", pattern: "src/features/*" },
    { type: "app",     pattern: "src/app/*" },
  ],
},
rules: {
  "boundaries/dependencies": [2, {
    default: "disallow",
    policies: [
      { from: { element: { type: "app" } },
        allow: { to: { element: { types: { anyOf: ["feature", "shared"] } } } } },
      { from: { element: { type: "feature" } },
        allow: { to: { element: { type: "shared" } } } },
    ],
  }],
},
```

Verify rule names against the installed version before committing — the fetched README did not
enumerate the full rule inventory.

### Tier 3 — `dependency-cruiser` (cycles and transitive reach, which ESLint cannot see)

Expresses the cross-feature ban **once**, with a capture group:

```js
{
  name: "no-cross-feature-imports",
  severity: "error",
  comment: "Features should not depend on other features",
  from: { path: "^src/features/([^/]+)/.+" },
  to:   { path: "^src/features/([^/]+)/.+", pathNot: "^src/features/$1/.+" }
}
```

It operates on the module dependency graph rather than individual import statements, so it also
catches circular dependencies and indirect/transitive violations.

### Tier 4 — Nx `@nx/enforce-module-boundaries` (monorepo, tag-based)

Nx's four library types are worth knowing even outside Nx, because they are the same
dependency-direction idea at package granularity:

| Type | May depend on |
|---|---|
| `feature` | any type |
| `ui` | `ui`, `util` |
| `data-access` | `data-access`, `util` |
| `util` | `util` only |

They map recognizably onto FSD layers (`util` ≈ shared, `ui` ≈ shared/ui, `data-access` ≈
entities/api, `feature` ≈ features+pages) — which is the cleanest way to explain to a team that
"going monorepo" is not a different architecture, just a harder-enforced version of the same one.

Nx's governance advice generalizes to any tagging scheme, FSD layers included: *"Keep the number of
library types low. Clearly document what each type of library means."*

### Design-system boundary (R7)

```js
'no-restricted-imports': ['error', { patterns: [
  { group: ['@radix-ui/*', '@mui/*'],
    message: 'Raw primitives may only be imported inside components/ui/. Wrap it there instead.' },
]}],
```

`[HOUSE]` — an inference from bulletproof-react's "wrap third-party components" rule, not a quoted
config. Scope it with an override so `components/ui/**` is exempt.

## Path aliases

`[CONVENTION]` A **single** `@/*` alias, not many:

```json
{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } } }
```

bulletproof-react's rationale: *"it is short enough so there is no need to configure multiple paths
and it differs from other dependency modules so there is no confusion in what comes from
`node_modules` and what is our source folder."*

`[CONVENTION]` FSD's relative-vs-absolute convention, which pairs with the layer rule:
**relative imports with full paths within the same slice; absolute aliased imports across slices.**
That gives a mechanically checkable pair — a relative import that escapes the current slice (`../../`)
is a violation, and an alias import into another slice's internals is a violation.

## Nesting

`[OFFICIAL, legacy]` *"Unless you have a very compelling reason to use a deep folder structure,
consider limiting yourself to a maximum of three or four nested folders within a single project."*
(React FAQ, legacy docs site — no react.dev successor page exists.)
