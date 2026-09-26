# Business logic — which layer owns what

Reference for [SKILL.md](./SKILL.md) R4–R6. Sources in [SOURCES.md](./SOURCES.md).

**Authority note:** official docs (React, Next.js, TanStack, Redux) prescribe *rules about specific
mechanisms* — hooks, effects, actions, stores. They do **not** prescribe a folder architecture. The
one exception is Next.js's Data Access Layer, which is officially recommended.

## The ladder

```
component            presentation only
   ↓
custom hook          ONLY if it calls hooks
   ↓
model/ (pure fns)    domain rules — testable without React
   ↓
api/ (I/O)           fetchers, schemas, queryOptions
   ↓
DAL (server-only)    authorization + data access   ← the only OFFICIAL layer
```

`[CONVENTION]` The three widely-used conventions map onto each other cleanly:

| FSD | bulletproof-react | Clean Architecture |
|---|---|---|
| `model` | `features/*/stores` + domain fns | Domain + Application |
| `api` | `features/*/api` | Adapters |
| `ui` | `features/*/components` | Presentation |

FSD bundles *"stores **and** business logic"* into one `model` segment, which implicitly endorses
putting domain rules next to the store rather than in a separate entity layer — a lighter
arrangement than Clean Architecture's.

Both FSD and bulletproof-react enforce layering with **import direction**, not with class
hierarchies. That matters: "business logic goes in layer X" is not lintable on its own; an import
rule is.

## R4 in depth — hook or plain function? · `[OFFICIAL]`

The rule is mechanical, not philosophical:

> **"Functions that don't *call* Hooks don't need to *be* Hooks."**
> *"If your function doesn't call any Hooks, avoid the `use` prefix."*

| | |
|---|---|
| 🔴 | `useSorted(items) { return items.slice().sort() }` |
| ✅ | `getSorted(items)` |

The converse: *"You should give `use` prefix to a function (and thus make it a Hook) if it uses at
least one Hook inside of it"* — e.g. `function useAuth() { return useContext(Auth) }`.

Stated reason, and it is architectural: *"This ensures that your code can call this regular function
anywhere, including conditions."*

Also 🔴, verbatim: *"Avoid creating and using custom 'lifecycle' Hooks that act as alternatives and
convenience wrappers for the `useEffect` API itself"* — `useMount`, `useEffectOnce`, `useUpdateEffect`.

Two more rules that constrain design:

- *"**A good custom Hook makes the calling code more declarative by constraining what it does.**…
  If your custom Hook API doesn't constrain the use cases and is very abstract, in the long run it's
  likely to introduce more problems than it solves."* → name hooks for the **domain use case**
  (`useCheckout`), not generically (`useBusinessLogic`).
- *"Custom Hooks only share stateful logic, **not state itself**."* → two components calling the
  same hook get two independent states. Sharing *state* requires Context, a store, or the query cache.

`[OFFICIAL]` react.dev's own closing position: *"It's up to you how and where to choose the
boundaries of your code."* Any stricter rule in this skill is a house convention, and says so.

## R5 in depth — server state vs client state

### Server state is categorically different · `[OFFICIAL]`

TanStack Query defines it by four properties:

- *"Is persisted remotely in a location you may not control or own"*
- *"Requires asynchronous APIs for fetching and updating"*
- *"Implies **shared ownership** and can be changed by other people without your knowledge"*
- *"Can potentially become 'out of date' in your applications if you're not careful"*

> *"While most traditional state management libraries are great for working with client state, they
> are **not so great at working with async or server state**."*

### Where query logic lives · `[OFFICIAL]` v5 + `[CONVENTION]` placement

`queryOptions()` is the v5-native home for a query's key and fetcher — it keeps them *"co-located to
one another"* with type inference, and the same factory feeds every entry point:

```ts
function groupOptions(id: number) {
  return queryOptions({
    queryKey: ['groups', id],
    queryFn: () => fetchGroups(id),
    staleTime: 5 * 1000,
  })
}

useQuery(groupOptions(1))
useSuspenseQuery(groupOptions(5))
queryClient.setQueryData(groupOptions(42).queryKey, newGroups)
```

**Hand-rolled `queryKeys` factory objects are pre-v5 legacy** — subsumed by `queryOptions`.

`[CONVENTION]` Placement — TanStack publishes **no** project-structure page, so this is
bulletproof-react's convention, not TanStack doctrine. One file per endpoint under
`features/<x>/api/<verb-noun>.ts`, exporting:

1. the Zod schema(s)
2. the fetcher that calls the **single shared API client** instance
3. a `queryOptions` factory
4. a thin `use<Thing>()` hook

Components import **only** (4).

`[OPINION, maintainer]` TkDodo: *"Even wrapping a single `useQuery` call in a dedicated hook provides
benefits: co-locates data-fetching logic, centralizes key definitions, and enables modifications in
one location."* And: treat query keys exactly like `useEffect` dependency arrays.

### Don't duplicate server state · `[OPINION, maintainer]`

- *"resist the urge to sync server data to a different state manager"*
- *"If you get data from `useQuery`, try not to put that data into local state"* — copying stops
  background updates from reaching components.
- `queryClient.setQueryData()` is for optimistic updates and mutation responses **only**; background
  refetches will clobber manual writes.

**Checkable:** `useState(...)` initialised from, or a `useEffect` syncing from, a `useQuery` result.

## Client state — the decision ladder · `[OFFICIAL]` + `[CONVENTION]`

1. **Derive it during render.** `[OFFICIAL]` *"If you can calculate something during render, you
   don't need an Effect."*
2. **`useState` in the component that owns it.** `[CONVENTION]` *"begin by defining state within the
   component itself and consider elevating it to a higher level if it's required elsewhere."*
3. **Lift to the nearest common parent** when two siblings need it.
4. **Put it in the URL** if it should survive reload / be shareable / respect the back button —
   filters, tabs, pagination, search. (`nuqs` for type-safe search params in the App Router.)
5. **Context** for low-frequency, wide-reach values: theme, locale, current user.
6. **A store** (Zustand / RTK / Jotai) only when Redux's own criteria apply.
7. **Never a store for server data** — that is the query cache.

`[OFFICIAL]` Redux's own FAQ declines to recommend Redux by default:

> *"Not all apps need Redux."* — and Dan Abramov, quoted **in the official FAQ**: *"don't use Redux
> until you have problems with vanilla React."*

Its four criteria — *"large amounts of application state that are needed in many places"*, *"state
is updated frequently"*, *"the logic to update that state may be complex"*, *"medium or large-sized
codebase … worked on by many people"*. And the stated cost: *"It also adds some indirection to your
code, and asks you to follow certain restrictions. It's a trade-off between short term and long term
productivity."*

That makes **"we use a store" a claim to justify per state slice, not per project** — a usable
review rule.

`[CONVENTION]` bulletproof-react's five-way taxonomy is the cleanest vocabulary: component state ·
application state · **server cache state** · form state · URL state. Note that it lists
"Context + Hooks" under *application* state (theme/modals/notifications — low update frequency), not
high-churn state.

`[HOUSE]` Zustand's own slices documentation could not be retrieved (404 at time of research).
Zustand appears here only via bulletproof-react's recommendation list — do not attribute specific
store-organisation rules to Zustand.

## R6 in depth — the Next.js Data Access Layer · `[OFFICIAL]`

The strongest officially-sourced layering rule found anywhere in this research.

> *"We recommend creating a DAL to centralize your data requests and authorization logic."*

Shape:

```ts
import 'server-only'
import { cache } from 'react'

export const verifySession = cache(async () => { /* validate session, redirect or return user */ })
export const getUser = cache(async () => { /* verifySession() → query → return a DTO */ })
```

The payoff, verbatim: *"This guarantees that wherever `getUser()` is called within your application,
the auth check is performed, and **prevents developers from forgetting to check that the user is
authorized to access the data**."*

`import 'server-only'` is what makes the layer real: it turns "don't import the DAL from a client
component" from a convention into a **build error**. That is the App Router's equivalent of
`import/no-restricted-paths`.

**Location conflict, both official and unreconciled:** the Authentication guide uses `app/lib/dal.ts`;
the Data Security guide uses a top-level `data/`. **This skill picks `app/lib/dal.ts`**, because it
keeps server-only modules inside the routing tree where colocation is already guaranteed safe, and
because the auth guide is the more detailed of the two. Either is defensible — pick one and be
consistent.

### Where authorization must NOT live · `[OFFICIAL]`

- **Not in layouts.** *"be cautious when doing checks in Layouts as these don't re-render on
  navigation… A layout also does not control whether the rest of the route renders."* The SPA
  pattern of returning `null` in a layout is *"not recommended"*.
- **Not in proxy/middleware alone.** *"it should not be your only line of defense… The majority of
  security checks should be performed as close as possible to your data source."* Proxy checks are
  optimistic (cookie-only). Worse, a matcher change *"can silently remove Proxy coverage."*
- **Not in the UI.** *"Render-time gating … is not a security boundary."* / *"client-side UI
  restrictions alone are not sufficient for security."*

### Server Actions · `[OFFICIAL]`

> *"The implementation stays on the server, but the route is reachable to anyone who can send the
> same POST. **Treat every action as an untrusted entry point.**"*

Three requirements inside **every** action:

1. **Authenticate and authorize** — a page-level check does not extend to actions defined in it.
2. **Validate inputs** — treat `FormData`, query params and headers as untrusted.
3. **Constrain return values** — *"Shape them to what the UI renders, not raw database records."*

The sharpest quote in the whole research, and the reason schema validation is not enough:

> *"**Schema validation (zod or similar) only checks the *shape* of the input. A well-formed `Item`
> object can still refer to a row the caller does not own.**"*

Fix: send a reference (an ID) plus the change, and re-read the rest from a trusted source using the
session — `completeItem(itemId: string)`, not `completeItemUnsafe(item: Item)`.

**The thin-action layering rule:**

> *"Just as we recommend a Data Access Layer for reading data, you can apply the same pattern to
> mutations. This keeps authentication, authorization, and database logic in a dedicated
> `server-only` module, while `"use server"` actions stay thin."*

`[HOUSE]` Colocated `actions.ts` vs a central `app/actions/`: the official docs use **both** and
never prescribe one. Mandate the *layering*, leave the folder to house style. Since a `"use server"`
file exports a public endpoint per export, prefer one actions file per feature exporting only what
that feature's UI calls — it minimizes the public surface.

Runtime constraint that forces a layering decision: *"do not rely on `Promise.all` to parallelize
Server Actions from the client. If you need parallel work, do it inside a single Server Action."*
An action is therefore naturally a **use-case-sized unit**, not a CRUD primitive.

## Validation schemas · `[CONVENTION]`

No source prescribes a `schemas/` or `contracts/` top-level module — that naming is team preference.
Two documented conventions, compatible with each other:

- Next.js (tutorial-scale): `app/lib/definitions.ts`, imported by the Server Action which `safeParse`s
  the `FormData` and returns `error.flatten().fieldErrors`.
- bulletproof-react (scaling): schema next to the endpoint in `features/*/api/`.

`[HOUSE]` House rule: **the schema lives next to the thing it describes** — a domain invariant in
`model/`, a wire contract in `api/`. The form imports it rather than redefining validation. Because
the server must re-validate regardless, a shared schema is what makes client-side validation a pure
UX affordance instead of a duplicated rule.

## Clean Architecture / DDD on the frontend · `[OPINION]`

**No official React, Next.js, Redux or TanStack documentation recommends it.** Label it opinion /
situational, never consensus.

The most credible advocate publishes the cost objections himself:

> *"If the project is small, a full implementation will be an overkill that will increase the entry
> threshold for newcomers."* / *"If you over-engineer at the beginning of a project, it will be
> harder to onboard new developers later."*

**Evidence asymmetry, stated plainly:** no high-authority, named, recent critique was found — the
critique side is served by anonymous or undated blog posts. Do not prop up the anti- side with a weak
citation. What *can* be claimed as near-consensus is the failure mode both sides name: small project
+ full implementation = overkill.

The honest synthesis: the **ideas** travel (pure domain functions, use cases as named units, adapters
at the I/O boundary); the **ceremony** (DI containers, interface-per-repository, full port/adapter
ritual) mostly does not pay for itself. That is exactly what FSD encodes by collapsing domain +
application into one `model` segment and skipping DI entirely.

Pragmatic rule that survives both sides: **extract domain rules into pure, framework-free functions
(testable without React), and stop there** unless a second consumer or a swappable backend actually
exists.

## Anti-patterns · `[OFFICIAL]` unless noted

The strongest checkable set, all verbatim-backed:

1. `use*` with no hook calls → make it a plain function.
2. `useEffect` that only sets state from props/state → delete it, compute during render.
   *"You don't need Effects to transform data for rendering."*
3. `useEffect` that fetches → use the query layer or a Server Component.
4. `useState` initialised from a `useQuery` result → delete it. `[OPINION, maintainer]`
5. Any `fetch` in a component body → move to `features/*/api`. `[CONVENTION]`
6. A Server Action without an auth check and an input parse → incomplete.
7. Logic in an Effect that belongs in an event handler. The official test: *"If this logic is caused
   by a particular interaction, keep it in the event handler. If it's caused by the user seeing the
   component on the screen, keep it in the Effect."*
8. Duplicated logic across two handlers → *"Delete the Effect and put the shared logic into a
   function called from both event handlers."*
9. `[HOUSE]` A named domain rule inline in JSX → extract to `model/`. **This has no official
   citation** — react.dev endorses computing derived values during render.
10. `[CONVENTION]` Domain rules in `utils`/`lib`. FSD reserves `lib` for *"library code that other
    modules on this slice need"* and `model` for business logic — a reviewable distinction and the
    documented answer to the "utils as a dumping ground" problem.
