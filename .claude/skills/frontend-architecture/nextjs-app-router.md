# Next.js App Router — structural conventions

Reference for [SKILL.md](./SKILL.md) R3. Sources in [SOURCES.md](./SOURCES.md).

Covers **where files go** and **where the Server/Client boundary belongs**. For how the APIs
themselves work, use `next-best-practices`.

## What the framework actually prescribes

> *"Next.js is **unopinionated** about how you organize and colocate your project files. But it does
> provide several features to help you organize your project."*

Four structural levers, and three sanctioned strategies.

### The colocation guarantee — the load-bearing fact · `[OFFICIAL]`

> *"even though route structure is defined through folders, a route is **not publicly accessible**
> until a `page.js` or `route.js` file is added to a route segment."*
> *"even when a route is made publicly accessible, only the **content returned** by `page.js` or
> `route.js` is sent to the client."*

Therefore *"project files can be safely colocated inside route segments in the `app` directory
without accidentally being routable."* And colocation is optional: *"While you can colocate your
project files in `app` you don't have to."*

**Consequence:** "where do non-route files go" is a **team-style decision, not a framework
constraint**. A house style here does not fight the framework.

### Private folders `_folder` · `[OFFICIAL]`

> *"This indicates the folder is a private implementation detail and should not be considered by the
> routing system, thereby **opting the folder and all its subfolders** out of routing."*

Explicitly *not required* for colocation. The four documented reasons to use them anyway: separating
UI logic from routing logic; consistent internal organization across the ecosystem; editor sorting;
**avoiding naming conflicts with future Next.js file conventions**.

`[HOUSE]` Rule: **any folder inside `app/` that is not a route segment must be `_`-prefixed or
`()`-wrapped** — routability becomes lexically obvious.

Escape hatch: `%5FfolderName` produces a URL segment that starts with an underscore.

### Route groups `(folder)` · `[OFFICIAL]`

> *"This indicates the folder is for organizational purposes and should **not be included** in the
> route's URL path."*

Documented uses: *"Organizing routes by site section, intent, or **team**"*; enabling nested layouts
at the same segment level; opting a **subset** of siblings into a layout; scoping a `loading.tsx`.

Multiple root layouts: *"remove the top-level `layout.js` file, and add a `layout.js` file inside
each route group… The `<html>` and `<body>` tags need to be added to each root layout."*

`[HOUSE]` **Route groups organize by app section / layout shape, not by feature.** Two routes belong
in the same group when they share chrome and auth posture — not when they share a domain entity.
Feature grouping belongs in `features/` or `_`-folders.

> Not verified — do **not** assert that navigating across root layouts forces a full page load. The
> fetched docs do not say it.

### `src/` · `[OFFICIAL]`

Optional and purely cosmetic as to routing: *"This separates application code from project
configuration files which mostly live in the root of a project."* The only framework-recognized
top-level folders are `app`, `pages`, `public`, `src`.

⚠️ `[OFFICIAL]` **`.env` files are loaded only from the parent folder, not from `/src`.**

### The three strategies · `[OFFICIAL]`

1. **Store project files outside of `app`** — *"keeps the `app` directory purely for routing purposes."*
2. **Store project files in top-level folders inside of `app`**.
3. **Split project files by feature or route** — globally shared code in root `app/`, specific code
   pushed into the route segments that use it.

Meta-rule: *"choose a strategy that works for you and your team and be consistent across the project."*

**This skill picks strategy 1.** It is the only one compatible with both bulletproof-react and FSD;
strategy 3 conflicts with both, because it scatters shared domain code across route segments.

`[OFFICIAL]` Folder names carry no meaning: *"we're using `components` and `lib` folders as
generalized placeholders, their naming has no special framework significance."*

## Special files — and how thin `page.tsx` should be

Routing files: `layout` · `page` · `loading` · `not-found` · `error` · `global-error` · `route` ·
`template` · `default`.

> *"Add `page` to expose a route, `layout` for shared UI such as header, nav, or footer, `loading`
> for skeletons, `error` for error boundaries, and `route` for APIs."*

Fixed render hierarchy: `layout` → `template` → `error` → `loading` → `not-found` → `page`.
`template.tsx` is justified only when per-navigation remount is required; otherwise use `layout.tsx`.

`[HOUSE]` **No official source states a size limit for `page.tsx`.** The rule this skill prescribes:

> `page.tsx` = await params/searchParams → validate → call the DAL → render one feature component +
> metadata.

Three documented facts jointly force it: a segment becomes public only through `page`/`route`;
params/searchParams *"should not be trusted and need to be re-verified each time they are read"*;
and *"Fetch data in Server Components directly from its source."*

`[CONVENTION]` FSD takes this to its limit — `app/**/page.tsx` becomes a **pure re-export shim**:
`export { ExamplePage as default } from '@/_pages/example'`.

## `middleware.ts` → `proxy.ts` · Next 16 · `[OFFICIAL]`

**Confirmed, not rumored.** The `proxy.js` reference states: *"The `middleware` file convention is
deprecated and has been renamed to `proxy`."* Version history: *"`v16.0.0` — Middleware is deprecated
and renamed to Proxy. Proxy defaults to the Node.js runtime."*

Codemod: `npx @next/codemod@canary middleware-to-proxy .`

**This repo is on Next 15.1** — `middleware.ts` is still correct here; treat `proxy.ts` as the
forward path.

The rename carries an architectural signal worth keeping: *"the term 'middleware' can often be
confused with Express.js middleware… this feature is recommended to be used as a last resort"* and
*"We recommend users avoid relying on Middleware unless no other options exist."* Also: *"Proxy is
meant to be invoked separately of your render code… you should not attempt relying on shared modules
or globals."* One per project, at the root (or inside `src`, level with `app`).

**Treat it as a network edge, not an app layer.**

## Where the Server/Client boundary belongs · `[OFFICIAL]`

`layout` and `page` are Server Components by default.

The transitivity rule and its escape hatch are the whole design:

> *"Once a file is marked with `"use client"`, **all of its imports and the components it directly
> renders are included in the client bundle**."*
> *"It does not apply to Server Components passed as children or other props."*

Rules that follow:

- **Push `'use client'` to interactive leaves**, not to large parts of the UI.
- **`children` slot** when an interactive component must wrap server content.
- **Providers as deep as possible** — *"notice how `ThemeProvider` only wraps `{children}` instead of
  the entire `<html>` document."* `[CONVENTION]` bulletproof-react's trick: isolate all client
  providers in `app/provider.tsx` so the root layout stays a Server Component.
- **Wrap third-party client-only components** in a one-line `'use client'` re-export.
- **`server-only` / `client-only`** turn boundary violations into build-time errors. Put
  `import 'server-only'` at the top of every DAL/session/db module. Installing the packages is
  *"optional"* in Next.js.
- `[OFFICIAL]` *"Client Components can't import the DAL. Run `verifySession()`, `getUser()`, or
  similar in a parent Server Component, then pass data to client children as props or through a
  context provider."*
- `[OFFICIAL]` RSC and Client Components *"execute in a separate module system … to avoid
  accidentally exposing information between the two"*. SSR'd Client Components *"should be considered
  as the same security policy as the browser client."*

**Checkable smell:** `'use client'` in `layout.tsx` or `page.tsx`.

## Data and mutations

`[OFFICIAL]` Three mutually exclusive approaches: *"HTTP APIs: for existing large applications and
organizations. / Data Access Layer: for new projects. / Component-Level Data Access: for prototypes
and learning."* Plus: *"We recommend choosing one data fetching approach and avoiding mixing them."*

The DAL and Server Action rules live in [business-logic.md](./business-logic.md). The structural
summary:

```
app/<route>/page.tsx      Server Component, thin
app/actions.ts            "use server" — thin, delegates
app/lib/dal.ts            import 'server-only' — auth + data access + DTOs
```

Both markers can coexist: *"You can use `import 'server-only'` in both the Data Access Layer and the
`"use server"` file itself."*

`[OFFICIAL]` **No mutations during render:** *"Mutations (e.g. logging out users, updating databases,
invalidating caches) should never be a side-effect, either in Server or Client Components."*

One placement fact driven by streaming: *"A top-level `await` on `cookies()`, `headers()`, or the DAL
in a layout delays the first streamed chunk for that segment and holds `{children}` behind that work.
If only part of the shell needs session data… move the `await` into a nested Server Component and
wrap it in `<Suspense>`."*

### The official audit checklist · `[OFFICIAL]` — converts straight into review rules

- **DAL:** is there an isolated Data Access Layer? *"Verify that database packages and environment
  variables are not imported outside the Data Access Layer."*
- **`"use client"` files:** are the component props expecting private data? Are the type signatures
  overly broad?
- **`"use server"` files:** are arguments validated? Is the user re-authorized inside the action?
  Does it check ownership of the resource? Are return values filtered? Is DB access delegated to a
  `server-only` DAL?
- **`/[param]/`:** folders with brackets are user input. Are params validated?
- **`proxy.ts` and `route.ts`:** *"Have a lot of power."*

## Route Handlers — when to have your own API at all

`[OFFICIAL]` *"Next.js backend capabilities are not a full backend replacement. They serve as an API
layer that: is publicly reachable / handles any HTTP request / can return any content type."*
*"Route Handlers are public HTTP endpoints. Any client can access them."*

**The anti-pattern, verbatim:**

> *"Fetch data in Server Components directly from its source, **not via Route Handlers**. For Server
> Components prerendered at build time, using Route Handlers will fail the build step… For Server
> Components rendered on demand, fetching from Route Handlers is slower due to the extra HTTP round
> trip."*

`[HOUSE]` Decision rule: **create `app/api/**/route.ts` only when a non-Next.js caller needs it** —
browser-side polling of client-only APIs, third-party webhooks, OAuth callbacks, non-UI content
(`rss.xml`, `.well-known`), or a deliberate BFF/proxy in front of an existing backend. Otherwise the
Server Component + DAL path is the documented route.

Legitimate client-side fetching, per the docs: *"Data that depends on client-only Web APIs"*
(geolocation, storage, audio, file) and *"Frequently polled data"* — *"For these, use community
libraries like `swr` or `react-query`."*

`[OFFICIAL]` Server Actions are **not** a fetching tool: *"Server Actions are queued. Using them for
data fetching introduces sequential execution."*

Deployment constraints that affect where logic may live: handlers *"cannot share data between
requests"*; the environment may not support filesystem writes; long-running handlers may be
terminated; WebSockets won't work.

Existing-backend case: *"You should follow a **Zero Trust** model when adopting Server Components in
an existing project. You can continue calling your existing API endpoints such as REST or GraphQL
from Server Components using `fetch`."*

## FSD on the App Router · `[CONVENTION]`

There is a direct name collision: FSD has `app` and `pages` **layers**; Next.js reserves both folder
names. The official FSD guide's answer, verbatim:

> *"To avoid conflicts, rename **both** `app` and `pages` FSD layers to `_app` and `_pages`,
> regardless of which router you use."*

```
app/                  # Next.js routing only
src/
  _app/               # FSD App layer (+ an api-routes segment for Route Handlers)
  _pages/             # FSD Pages layer
  widgets/ features/ entities/ shared/
```

The `_` prefix is not arbitrary — it is exactly Next's own private-folder convention. Route files
become pure re-export shims. Server/client splitting uses `index.server.ts`. Middleware and
instrumentation stay at the project root.

Caveat from the same page: *"Be mindful when writing backend code in the FSD structure — FSD is
primarily intended for frontends."*

> Do not claim that FSD's `steiger` linter ships a Next.js preset — unverified.

## Colocation in practice — `_components/` vs `features/`

Official docs permit both and prescribe neither. **bulletproof-react's own Next.js app uses both at
once** — which settles the debate empirically:

```
src/features/discussions/{api,components}/   # reusable domain code
src/app/app/_components/                     # route-only UI
src/app/provider.tsx                         # client providers isolated
src/app/app/discussions/__tests__/           # tests colocated in a route segment
```

`[HOUSE]` **The two-tier rule:**

- used by exactly one route → `app/<segment>/_components/`
- used by 2+ routes, or encodes domain logic → `features/<domain>/components/`
- promotion happens on the **second consumer**

`_lib/` is legitimized by the official conventions table (`app/blog/_lib/data.ts` — *"Not routable;
safe place for utils"*). `_hooks/` is a natural extension but **no official example names it**.

> `[OFFICIAL]` gap: **no official Next.js example uses a top-level `features/` folder.** It is
> convention, not framework.

## Tests and i18n placement

`[CONVENTION]` Both are library/community conventions — Next.js docs contain **no** prescription for
either.

- Tests colocate safely by the same colocation guarantee. bulletproof-react puts `__tests__/`
  directly inside a route segment, plus a top-level `testing/` for *"test utilities and mocks"*.
  `[HOUSE]` House rule: `<Name>.test.tsx` next to its component; shared render helpers/MSW handlers
  in one top-level `testing/`.
- next-intl: `app/[locale]/layout.tsx`, config in `src/i18n/{routing,request,navigation}.ts`, and
  messages in a top-level `messages/<locale>.json` — the library is *"agnostic to how you store
  messages"*. Note next-intl has already adopted the v16 rename (`src/proxy.ts`, *"formerly
  middleware.ts"*).
- `[HOUSE]` Because `[locale]` is the outermost dynamic segment, i18n routing forces every route
  group to sit **inside** `app/[locale]/` — worth checking against the multiple-root-layouts pattern.
