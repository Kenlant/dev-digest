# Sources

Every URL cited anywhere in this skill, with its author, date and authority tier. Compiled from five
parallel research tracks (folder structure · component design · business logic · constants/utils/types
· Next.js App Router), all fetched **2026-09-25**.

Raw research notes: `research_notes/Архітектура фронтенду React Next/` ·
Full synthesis report: `reports/Архітектура фронтенду React Next.md`

**Read the tier before reusing a claim.** Authority on this topic is very unevenly distributed:
file-level React rules, the RSC boundary, the `enum` ban and the env-inlining rules are official and
quotable; folder layout, prop counts, line counts and the "rule of three" are documented by nobody
official.

---

## ⚠️ Do not cite

| Source | Why |
|---|---|
| `https://feature-sliced.design/blog/*` — incl. `/blog/nextjs-app-router-guide` | **SEO content farm.** Every post credited to one "Evan Carter", all dated 2026, off-topic (progressive hydration, BEM, "The Fastest Frontend Framework of 2025"), with a gambling/sports-betting link footer. **No `blog/` directory exists in the official `feature-sliced/documentation` repo** (raw GitHub 404s). Some of its advice coincides with the real docs — that does not make it a source. |

FSD domain note: three domains front the same docs — `feature-sliced.design`, `feature-sliced.org`,
**`fsd.how`** (now the repo's declared homepage). The `/docs/` tree was verified byte-identical
across them. Cite `/docs/`, never `/blog/`.

---

## Official — React

| Title | URL | Date | Use it for |
|---|---|---|---|
| Your First Component | https://react.dev/learn/your-first-component | undated | Capitalization, top-level declaration, *"🔴 Never define a component inside another component!"* |
| Importing and Exporting Components | https://react.dev/learn/importing-and-exporting-components | undated | One default export per file; named exports for multi-component files; anonymous components discouraged; when a component earns its own file |
| Passing Props to a Component | https://react.dev/learn/passing-props-to-a-component | undated | The `children` "hole" metaphor; *"don't overuse"* prop spreading |
| **Passing Data Deeply with Context** | https://react.dev/learn/passing-data-deeply-with-context | undated | **The single most valuable page for this skill:** the props → `children` → Context ladder, and *"Just because you need to pass props several levels deep doesn't mean you should use context."* Plus the Context whitelist |
| Sharing State Between Components | https://react.dev/learn/sharing-state-between-components | undated | Lifting-state-up recipe; single source of truth; controlled vs uncontrolled |
| Thinking in React | https://react.dev/learn/thinking-in-react | undated | The official single-responsibility split rule; data-model ↔ component-tree mapping |
| **Reusing Logic with Custom Hooks** | https://react.dev/learn/reusing-logic-with-custom-hooks | undated | **R4:** *"Functions that don't call Hooks don't need to be Hooks"*; 🔴 `useMount`/`useEffectOnce`/`useUpdateEffect`; *"Custom Hooks only share stateful logic, not state itself"* |
| You Might Not Need an Effect | https://react.dev/learn/you-might-not-need-an-effect | undated | The canonical anti-pattern list: derived state, event logic, data fetching in Effects |
| Choosing the State Structure | https://react.dev/learn/choosing-the-state-structure | undated | "Avoid redundant state" |
| `"use client"` directive reference | https://react.dev/reference/rsc/use-client | undated | Placement syntax; passing JSX as props to escape the client boundary |
| Server Components reference | https://react.dev/reference/rsc/server-components | undated | *"Client Components cannot import Server Components"* |
| React v19 (blog) | https://react.dev/blog/2024/12/05/react-19 | 2024-12-05 | `ref` as a prop / `forwardRef` sunset; RSC stable; *"There is no directive for Server Components"* |

### Official but **legacy** (legacy.reactjs.org — *"These docs are old and won't be updated"*)

| Title | URL | Use it for |
|---|---|---|
| FAQ: File Structure | https://legacy.reactjs.org/docs/faq-structure.html | The five-minute rule; the 3–4 nesting cap; official neutrality between feature- and type-grouping. **No react.dev successor page exists** — modern React docs dropped the topic |
| Higher-Order Components | https://legacy.reactjs.org/docs/higher-order-components.html | Useful precisely because it says *"Higher-order components are not commonly used in modern React code"*; "don't use HOCs inside render" |

## Official — Next.js / Vercel

All pages self-reported docs **version 16.3.6**. This repo runs Next 15.1 — see the version notes in
[SKILL.md](./SKILL.md).

| Title | URL | Last updated | Use it for |
|---|---|---|---|
| **Project structure and organization** | https://nextjs.org/docs/app/getting-started/project-structure | 2026-07-21 | The canonical structural source: *"unopinionated"*, `src/`, route groups, private folders, the colocation guarantee, the three strategies, the file-conventions table |
| **Server and Client Components** | https://nextjs.org/docs/app/getting-started/server-and-client-components | 2026-08-25 | `"use client"` module-graph transitivity and the `children` escape; split-to-the-leaf; providers as deep as possible; third-party wrappers; `server-only`/`client-only`; prop serializability |
| **How to think about data security in Next.js** | https://nextjs.org/docs/app/guides/data-security | 2026-08-25 | The three data approaches; the thin-`"use server"`-over-`server-only`-DAL layering; the audit checklist; *"only the Data Access Layer should access `process.env`"* |
| How to implement authentication in Next.js | https://nextjs.org/docs/app/guides/authentication | 2026-08-25 | The DAL, `verifySession`, `cache()`, DTOs; *why layouts are unsafe for auth*; proxy is optimistic only; *"Client Components can't import the DAL"* |
| Server Actions and Mutations | https://nextjs.org/docs/app/guides/server-actions | 2026-06-17 | *"Treat every action as an untrusted entry point"*; the three in-action requirements; *"Schema validation … only checks the shape of the input"*; no `Promise.all` across actions |
| Mutating Data | https://nextjs.org/docs/app/getting-started/mutating-data | 2026-08-25 | `"use server"` file-level vs inline placement; *"reachable via direct POST"*. (Note `/getting-started/updating-data` 404s — this is the live page) |
| Environment Variables | https://nextjs.org/docs/app/guides/environment-variables | 2026-08-25 | **R11:** `NEXT_PUBLIC_*` inlining, non-inlined dynamic lookups, build-time freezing, load order, the `/src` caveat, `@next/env`, runtime env via `connection()` |
| How to use Next.js as a backend for your frontend | https://nextjs.org/docs/app/guides/backend-for-frontend | 2026-06-25 | *"Fetch data in Server Components directly from its source, not via Route Handlers"*; the BFF/proxy pattern; deployment constraints |
| `route.js` (file convention) | https://nextjs.org/docs/app/api-reference/file-conventions/route | 2026-04-30 | Route Handler surface; v15 caching/params changes |
| `proxy.js` (file convention) | https://nextjs.org/docs/app/api-reference/file-conventions/proxy | 2026-09-07 | Confirms the **v16.0.0 `middleware` → `proxy` rename**, the codemod, placement, and the *"last resort"* framing |
| How to Think About Security in Next.js (blog) | https://nextjs.org/blog/security-nextjs-server-components-actions | 2023-10-23 | Origin of the DAL/DTO vocabulary; taint APIs; params/searchParams are untrusted. **Older — still says `middleware.tsx`; restate in `proxy.ts` terms** |

## Official — languages, libraries, tools

| Title | Author/Org | URL | Date | Use it for |
|---|---|---|---|---|
| Handbook: Enums ("Objects vs Enums") | Microsoft / TypeScript | https://www.typescriptlang.org/docs/handbook/enums.html | undated | **R8:** *"you may not need an enum when an object with `as const` could suffice"*; `typeof X[keyof typeof X]`; const-enum / `isolatedModules` incompatibility |
| tsconfig: `erasableSyntaxOnly` | Microsoft / TypeScript | https://www.typescriptlang.org/tsconfig/erasableSyntaxOnly.html | undated | The hard ban on `enum`/namespaces/parameter properties for type-stripping runtimes (Node v23.6+); pair with `verbatimModuleSyntax` |
| `consistent-type-imports` | typescript-eslint | https://typescript-eslint.io/rules/consistent-type-imports/ | undated | `import type` rationale; the trade-off table vs `verbatimModuleSyntax`; *"don't enable both"* |
| `no-restricted-imports` | ESLint | https://eslint.org/docs/latest/rules/no-restricted-imports | undated | `paths` / `patterns` / `group` options for targeted import bans |
| `no-restricted-paths` | eslint-plugin-import | https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md | undated | `zones` / `target` / `from` / `except` / `message` / `basePath` semantics |
| eslint-plugin-boundaries | Javier Brea | https://github.com/javierbrea/eslint-plugin-boundaries | undated | Typed elements + dependency policies; `entry-point` (= mechanical FSD public-API enforcement); `external`. Rules index: https://www.jsboundaries.dev/docs/rules/ |
| dependency-cruiser — rules reference | Sander Verweij | https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md | undated | Forbidden-rule shape; the capture-group cross-feature rule; graph-level checks ESLint cannot do |
| Enforce Module Boundaries | Nx (Nrwl) | https://nx.dev/features/enforce-module-boundaries | undated | Tags, `depConstraints`, four tag-matching strategies |
| Project Dependency Rules | Nx (Nrwl) | https://nx.dev/docs/concepts/decisions/project-dependency-rules | 2026-07-23 | The four library types verbatim and their constraints; *"Keep the number of library types low"* |
| Structuring a repository | Turborepo (Vercel) | https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository | undated | `apps/` vs `packages/`; `exports` as the entrypoint contract |
| Internal Packages | Turborepo (Vercel) | https://turborepo.dev/docs/core-concepts/internal-packages | undated | Sharing types across client/server; Just-in-Time vs Compiled packages; multiple entrypoints over a barrel |
| TanStack Query — Overview | TanStack, v5 | https://tanstack.com/query/latest/docs/framework/react/overview | undated | **R5:** the four defining properties of server state |
| TanStack Query — Query Options | TanStack, v5 | https://tanstack.com/query/latest/docs/framework/react/guides/query-options | undated | `queryOptions()` as the v5 home for key + fetcher, *"co-located to one another"* |
| Redux FAQ: General | Redux maintainers | https://redux.js.org/faq/general | undated | *"Not all apps need Redux"*; the four criteria; Abramov's *"don't use Redux until you have problems with vanilla React"*; the indirection trade-off |
| Composition (`asChild`) | Radix UI | https://www.radix-ui.com/primitives/docs/guides/composition | undated | `asChild` semantics; the spread-props / forward-ref / stay-accessible contract |
| Theme variables | Tailwind Labs, v4 | https://tailwindcss.com/docs/theme | undated | **Design tokens are CSS vars via `@theme`**; namespace table; `@theme inline`; reading tokens from JS as `var(--token)` |
| T3 Env — Introduction / Next.js | Julius Marminge et al. | https://env.t3.gg/docs/introduction · https://env.t3.gg/docs/nextjs | undated | The canonical validated `env.ts`; `runtimeEnv` strictness; server vars throw on the client |
| next-intl — App Router with i18n routing | Jan Amann | https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing | undated | `app/[locale]/` structure; `src/i18n/*`; notes `src/proxy.ts` *"formerly middleware.ts"* |
| next-intl — Configuration | next-intl | https://next-intl.dev/docs/usage/configuration | undated | Message-file placement; the library is *"agnostic to how you store messages"* |
| nuqs — Documentation | François Best (47ng) | https://nuqs.dev/docs | undated (v2.10.1) | Type-safe URL search-param state for the App Router. **No "what belongs in the URL" doctrine is stated there** — don't quote one |

## Convention tier — widely adopted, not standards

### bulletproof-react (Alan Alickovic) — 35.9k★, repo pushed 2026-05-14

| Doc | URL | Use it for |
|---|---|---|
| project-structure.md | https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md | The `src` tree; feature anatomy; the cross-feature ban; the unidirectional rule; **both `import/no-restricted-paths` configs**; the anti-barrel reversal |
| project-standards.md | https://github.com/alan2207/bulletproof-react/blob/master/docs/project-standards.md | The single `@/*` alias and its rationale; kebab-case lint rules; TypeScript as refactoring safety |
| components-and-styling.md | https://github.com/alan2207/bulletproof-react/blob/master/docs/components-and-styling.md | Colocation; extract-a-unit; *"Limit the number of props"*; wrap third-party components |
| api-layer.md | https://github.com/alan2207/bulletproof-react/blob/master/docs/api-layer.md | One shared API client; per-endpoint declaration = schema + fetcher + hook |
| state-management.md | https://github.com/alan2207/bulletproof-react/blob/master/docs/state-management.md | The five-way state taxonomy: component / application / server-cache / form / URL |
| `apps/nextjs-app/src` (source tree) | https://github.com/alan2207/bulletproof-react/tree/master/apps/nextjs-app/src | **Empirical proof of the hybrid:** top-level `features/` **+** `_components/` inside route segments **+** `app/provider.tsx` **+** colocated `__tests__/` |
| `components/ui/button/` | https://github.com/alan2207/bulletproof-react/tree/master/apps/react-vite/src/components/ui/button | Observed naming: kebab folder + `button.tsx` + `button.stories.tsx` + `index.ts` |

### Feature-Sliced Design — cite `/docs/` only

| Page | URL | Use it for |
|---|---|---|
| Reference: Layers | https://fsd.how/docs/reference/layers/ | The seven layers; *"A module (file) in a slice can only import other slices when they are located on layers strictly below"*; Shared's role; most projects need three layers |
| Reference: Slices and segments | https://feature-sliced.design/docs/reference/slices-segments | The five segments (`ui`/`api`/`model`/`lib`/`config`); *"types is a bad segment name"*; *"Shared should contain no business logic at all"*; the public-API requirement |
| Reference: Public API | https://feature-sliced.design/docs/reference/public-api | The barrel-as-contract argument; the ban on `export *`; `@x` cross-imports; **FSD's own admissions about circular imports and dev-server cost** |
| Get Started: Overview | https://feature-sliced.design/docs/get-started/overview | *"Slices cannot use other slices on the same layer"*; the soft overkill guidance |
| Get Started: Tutorial | https://feature-sliced.design/docs/get-started/tutorial | *"App, Pages, and Shared"* minimalism |
| Guide: Migration from Custom Architecture | https://feature-sliced.design/docs/guides/migration/from-custom | The only official migration triggers (three questions); the 8-step order; *"Avoid switching to FSD against the will of your teammates"* |
| Guide: Usage with Next.js | https://feature-sliced.design/docs/guides/tech/with-nextjs | *"rename both `app` and `pages` FSD layers to `_app` and `_pages`"*; re-export route shims; `index.server.ts` |
| About: Alternatives | https://feature-sliced.design/docs/about/alternatives | FSD's comparison to Atomic Design and Clean Architecture. **Self-serving — competitive framing, not neutral analysis** |

### shadcn/ui

| Page | URL | Use it for |
|---|---|---|
| Docs | https://ui.shadcn.com/docs | *"This is not a component library. It is how you build your component library"*; open-code ownership |
| Manual Installation | https://ui.shadcn.com/docs/installation/manual | The `lib/utils.ts` + `cn` convention; `components.json` aliases. Note current docs show `export { cn } from "cn"`, not the historical `twMerge(clsx(…))` |

## Practitioner tier — named individuals

| Title | Author | URL | Date | Use it for |
|---|---|---|---|---|
| Colocation | Kent C. Dodds | https://kentcdodds.com/blog/colocation | c. 2019-06-17 (no date on the fetched page) | *"Place code as close to where it's relevant as possible"*; the three costs of not colocating. The canonical reference for the term |
| Prop Drilling | Kent C. Dodds | https://kentcdodds.com/blog/prop-drilling | 2018-05-21 | The definition and its concrete failure modes; **the counter-argument against premature extraction** |
| Please Stop Using Barrel Files | TkDodo (Dominik Dorfmeister) | https://tkdodo.eu/blog/please-stop-using-barrel-files | 2024-07-26 | The circular-import argument (architecture) + module-count figures (performance) + the library-only exemption. High credibility: TanStack Query maintainer |
| React Query as a State Manager | TkDodo | https://tkdodo.eu/blog/react-query-as-a-state-manager | 2021-08-20 | *"React Query is in fact NOT a data fetching library"*; *"resist the urge to sync server data to a different state manager"* |
| Practical React Query | TkDodo | https://tkdodo.eu/blog/practical-react-query | 2020-11-16, upd. 2023-10-21 | Wrap even one `useQuery` in a hook; keys as dependency arrays; don't copy query data into local state. **Pre-v5 — flag hand-rolled key factories as legacy** |
| Components composition: how to get it right | Nadia Makarevich | https://www.developerway.com/posts/components-composition-how-to-get-it-right | 2022-04-12 | The most concrete extraction / non-extraction rules found anywhere; *"implements … OR composes …, not both"* |
| **Presentational and Container Components** | Dan Abramov | https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0 | 2015, **retraction added 2019** | **EXPLICITLY RETRACTED BY ITS AUTHOR.** Cite only as history + the retraction. Class-component/Flux era. medium.com 403s automated fetch; text verified via https://readmedium.com/smart-and-dumb-components-7ca2f9a7c7d0 |
| Clean Architecture on Frontend | Alex Bespoyasov | https://bespoyasov.me/blog/clean-architecture-on-frontend/ | 2021-09-02 | The fullest frontend Clean-Architecture advocacy **and its own cost caveats** (*"a full implementation will be an overkill"*). Pre-RSC |
| Screaming Architecture | Robert C. Martin | https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html | 2011-09-30 | *"what does the architecture of your application scream?"*; frameworks are not architecture. **Backend origin, pre-dates React entirely** |
| Atomic Design, ch. 2 | Brad Frost | https://atomicdesign.bradfrost.com/chapter-2/ | © 2016 | The five original definitions **and** *"atomic design is not a linear process, but rather a mental model"* |
| Dunghill Anti-Pattern | Matti Lehtinen | https://mattilehtinen.com/articles/dunghill-anti-pattern-why-utility-classes-and-modules-smell/ | 2023-09-05 | The named definition of the catch-all-utils smell; six harms; three fixes (colocate / domain-named files / services) |
| How to structure your React projects | Sandro Roth | https://sandroroth.com/blog/project-structure/ | 2023-02-16 | The three-stage ladder (type → bulletproof-react → FSD). **Pre-dates App Router maturity and the bulletproof-react barrel reversal — it still prescribes per-feature barrels** |

## Low authority — labelled so they don't get re-promoted

| Title | URL | Why it's listed |
|---|---|---|
| Utils files are not so useful… | https://dev.to/dvddpl/utils-files-are-not-so-useful-and-helper-classes-are-not-so-helpful-1kfn | Corroborates the duplication-through-invisibility failure mode on teams |
| TypeScript Enums Are Still Controversial in 2026 | https://jsmanifest.com/typescript-enums-const-objects-2026 | Corroborates the TS Handbook only. Never cite instead of it |
| Barrel Files: Why index.ts Re-Exports Hurt Tree Shaking… | https://reactuse.com/blog/barrel-files-tree-shaking/ | Pseudonymous, cross-posted. Useful only for naming lint rules (`import/no-cycle`, `eslint-plugin-no-barrel-files`). **Prefer TkDodo for the argument** |
| How Many Lines of Code Until I Need to Refactor a React Component? | https://medium.com/geekculture/how-many-lines-of-code-until-i-need-to-refactor-a-react-component-c1b8d16f5a5b | **The only source anywhere offering numeric line thresholds (100–200 / 500).** Cite as one person's opinion, never as convention |
| Clean Architecture for Frontend Sounds Smart — Until You Ship | https://medium.com/@mernstackdevbykevin/clean-architecture-for-frontend-sounds-smart-until-you-ship-62f9ccf54030 | Anonymous, undated. Illustrates the over-engineering critique; **not evidence** |
| Feature-Sliced Design vs Clean Architecture | https://dev.to/skorphil/feature-sliced-design-vs-clean-architecture-3m5k | bulletproof-react vs FSD trade-off framing |
| A Better Way to Structure React Projects | https://dev.to/krisguzman_dev/a-better-way-to-structure-react-projects-96a | Atomic-design subjectivity criticism |
| Atomic Design: React Component Structure Guide | https://codebrahma.com/atomic-design-react-component-structure-guide/ | Vendor blog. Atomic design *"overkill for smaller apps"* |
| Best Practices for Organizing Your Next.js 15 (2025) | https://dev.to/bajrayejoon/best-practices-for-organizing-your-nextjs-15-2025-53ji | Community framing of colocation-as-habit. Flavor only |
| Next.js 16 App Router Folder Structure Best Practices | https://www.dharmsy.com/blog/nextjs-16-app-router-folder-structure | Practitioner take on v16-era structure |
| Understanding Route Visibility and Colocation in Next.js App Router | https://dev.to/bridget_amana/understanding-route-visibility-and-colocation-in-nextjs-app-router-2bni | Restates `_folder`/`(folder)` semantics |

---

## Known conflicts

Documented here so future edits don't silently "fix" one side.

1. **DAL location — both official, unreconciled.** Authentication guide uses `app/lib/dal.ts`;
   Data Security guide uses a top-level `data/`. This skill picks `app/lib/dal.ts`.
2. **Barrels — FSD vs bulletproof-react/TkDodo.** FSD *mandates* a per-slice `index.ts`;
   bulletproof-react now advises against per-feature barrels. Resolved in
   [constants-utils-config.md](./constants-utils-config.md) as "barrel at a real boundary only" —
   which both sides' own text supports.
3. **Next.js strategy 3 vs both conventions.** *"Split project files by feature or route"* inside
   `app/` is officially sanctioned but conflicts with FSD and bulletproof-react, which require
   `app/` to be routing-only. This skill picks routing-only.
4. **bulletproof-react contradicts itself.** `project-structure.md` says avoid barrels and *"import
   the files directly"*, yet its own `components/ui/button/` ships an `index.ts`. The
   boundary-only reading reconciles them.
5. **Container/presentational.** Retracted by its author in 2019 — but RSC revives the shape with the
   split enforced by the runtime, which is exactly the objection ("arbitrary division") resolved.

## Known gaps — things no source states

Any rule in this skill covering these is tagged `[HOUSE]`.

- **No numeric migration trigger exists** — not files, LOC, features or team size. The "20+ features"
  figure attributed to FSD does **not** appear in the FSD docs.
- No source gives a maximum prop count, JSX nesting depth, conditional-branch count, or a defensible
  component line limit.
- No React-specific source states the "rule of three" / "used by 2+ features" promotion threshold —
  it is inherited from Fowler's *Refactoring*.
- No primary source says *"don't create a global `constants.ts`"* verbatim.
- No source states *"utils must be pure and must not import React"* verbatim — it is assembled from
  FSD's segment semantics.
- react.dev does **not** say "hooks are for React-specific logic", and does **not** name "business
  rules inside JSX" as an anti-pattern — it endorses computing derived values during render.
- No official rule for: `page.tsx` size, colocated vs central `actions.ts`, test-file placement,
  i18n message placement.
- **No official Next.js example uses a top-level `features/` folder.**
- No rigorous evidence compares feature- vs type-grouping outcomes. Every source on that axis is
  argument-from-experience.
- No high-authority, named, recent critique of frontend Clean Architecture was found — the critique
  side is anonymous/undated blogs. The asymmetry is stated rather than papered over.
- No published ESLint snippet bans `process.env` outside one module (`no-restricted-imports` cannot —
  it is not an import).
- Zustand's slices docs 404'd at research time; no verbatim Zustand guidance is carried here.

## Deliberately not asserted

Claims that surfaced during research but could **not** be verified:

- that `page.js` and `route.js` cannot coexist in one segment
- that navigating across root layouts forces a full page load
- that FSD's `steiger` linter ships a Next.js preset
- that Next.js officially endorses a top-level `features/` folder
- the legacy `cn` body (`twMerge(clsx(inputs))`) against a dated source
