# Components — placement, splitting, composition

Reference for [SKILL.md](./SKILL.md) R1 and R7. Sources in [SOURCES.md](./SOURCES.md).

**Authority warning for this whole file:** file-level rules and the composition ladder are
officially documented and quotable. Folder layout, prop counts and line counts are documented by
**nobody** official. Tiers below are not decoration.

## File-level rules · `[OFFICIAL]`

- Component names **must** start with a capital letter *"or they won't work"*.
- *"A file can have no more than one default export, but it can have as many named exports as you
  like."* Default export when the file exports one component; named exports when it exports several.
- *"Components without names, like `export default () => {}`, are discouraged because they make
  debugging harder."*
- **Never nest component definitions.** react.dev: *"you must never nest their definitions"* /
  *"🔴 Never define a component inside another component!"* — the snippet *"is very slow and causes
  bugs"* because state resets when the component type changes identity each render. Lintable:
  `react/no-unstable-nested-components`.
- react.dev explicitly declines to mandate default-vs-named: *"Do what works best for you!"* — so a
  house choice here is fine, but make it consistent.

## Naming and folder shape · `[CONVENTION]` / `[HOUSE]`

There is a genuine fork and **no authoritative source endorses either side**:

- `Button/Button.tsx` + `Button/Button.test.tsx` (PascalCase folder)
- `button/button.tsx` + `button/button.stories.tsx` + `index.ts` (kebab-case) — what bulletproof-react
  actually ships, enforced with `eslint-plugin-check-file`:
  ```js
  'check-file/filename-naming-convention': ['error', { '**/*.{ts,tsx}': 'KEBAB_CASE' }, { ignoreMiddleExtensions: true }],
  'check-file/folder-naming-convention': ['error', { 'src/**/!(__tests__)': 'KEBAB_CASE' }],
  ```

`[HOUSE]` Pick one per repo and enforce it mechanically. Consistency is the only defensible claim.

## When to split · ordered by authority

1. `[OFFICIAL]` **More than one concern.** *"a component should ideally only be concerned with one
   thing. If it ends up growing, it should be decomposed into smaller subcomponents."* Also:
   *"Separate your UI into components, where each component matches one piece of your data model."*
2. `[CONVENTION]` **A chunk of JSX that is a unit and could be named.** bulletproof-react: *"If there
   is a piece of UI that can be considered as a unit, is to extract it in a separate component"* —
   stated as the alternative to nesting render-functions inside a large component.
3. `[CONVENTION]` **Too many props.** *"Limit the number of props a component is accepting as
   input"* — fixed by splitting, or by composition via `children`/slots.
4. `[OPINION]` **It holds state unrelated to its stated purpose** (Makarevich).
5. `[OPINION]` **It no longer fits one screen without scrolling** (Makarevich's operational
   definition of "too big").
6. `[OPINION, low authority]` Line counts. The only numbers found anywhere (100–200 / 500) come from
   an undated Medium post. **Never use a line count as a gate** — use it to prompt a review against
   signals 1–4.

### The counter-pressure, which is real · `[OPINION]`

Kent C. Dodds argues *against* eager splitting, precisely because each split adds a prop-forwarding
layer. react.dev and bulletproof-react push toward decomposition; Dodds pushes back. **Both camps
resolve to composition (`children`) rather than more props** — that is the actual answer, not a
compromise.

`[OPINION]` Makarevich's don't-stop-halfway rule is the sharpest statement of a clean boundary:

> *"A component should be described either as a component that implements various stuff OR as a
> component that composes various components together, not both."*

### No numbers exist for

JSX nesting depth, count of conditional-render branches, maximum prop count. Plausible heuristics,
but uncited — mark any number you introduce as `[HOUSE]`.

## The composition ladder · `[OFFICIAL]` — the most valuable rule here

react.dev's escalation order is explicit and checkable:

**pass props → extract a component and pass JSX as `children` → only then Context.**

> **"Just because you need to pass props several levels deep doesn't mean you should use context."**

The two documented alternatives, verbatim:

1. *"**Start by passing props.** If your components are not trivial, passing a dozen props through a
   dozen components makes the data flow explicit."*
2. *"**Extract components and pass JSX as `children` to them.** If you pass data through many layers
   of intermediate components that don't use that data, you may have forgotten to extract some
   components. Instead of `<Layout posts={posts} />`, make `Layout` take `children` as a prop:
   `<Layout><Posts posts={posts} /></Layout>`."*

*"If neither approach works well for you, consider context."*

Context's sanctioned use cases (the whitelist): **theming, current account, routing, managing
complex state with a reducer**.

**Checkable rule:** a prop passed through a component that does not read it → first try extracting
and using `children`. "3+ levels" is a *heuristic trigger to run this check*, never itself a
justification for Context.

### Patterns and their status

| Pattern | Status |
|---|---|
| `children` / slots | `[OFFICIAL]` the default. *"a component with a `children` prop as having a 'hole'"* |
| Lifting state up | `[OFFICIAL]` *"for each piece of state, there is a specific component that holds that piece of information"* |
| Compound components (`<Tabs><TabsList>…`) | `[CONVENTION]` Context applied at library scope — the sanctioned use, since the shared value is UI state owned by one root. No primary source gives a "when to build one" rule. |
| `asChild` / Slot polymorphism | `[OFFICIAL, library]` Radix. Contract: spread all props, forward refs, *"It is your responsibility to ensure the element type rendered by your custom component remains accessible and functional."* |
| Render props / headless | `[HOUSE]` still valid, no longer the default. react.dev has **no page** on them — nothing to cite either way. Survives mostly as hooks. |
| HOCs | **legacy.** Officially: *"Higher-order components are not commonly used in modern React code."* Absent from react.dev entirely. React 19's ref-as-prop removes one of their last structural justifications. Framework-provided HOCs (`React.memo`, `dynamic()`) are not user-authored composition and are fine. |

## Container / presentational — retracted by its author

`[OPINION, RETRACTED]` Dan Abramov, 2019 note prepended to his own 2015 article:

> *"I don't suggest splitting your components like this anymore… I've seen it enforced without any
> necessity and with almost dogmatic fervor far too many times… Hooks let me do the same thing
> without an arbitrary division."*

Cite it **only** as history. Two of the original "container" bullets are dead on their own terms
("Call Flux actions", "Usually generated using higher order components").

What survives is not the pattern but its goal — and RSC revives exactly that shape, with the
division enforced by the runtime rather than being arbitrary, which is precisely Abramov's objection
resolved. Do not claim Abramov endorses "custom hook + dumb component" as the replacement; his
retraction points at hooks generically and nothing more.

## Prop design as an architectural signal

- `[CONVENTION]` Prop count is the most concrete boundary smell. Fix by splitting or by `children`.
- `[OFFICIAL]` *"You can forward all props with `<Avatar {...props} />` JSX spread syntax, but don't
  overuse it!"*
- `[HOUSE]` Mutually exclusive booleans indicate one enumerated `variant`/`size` prop. No primary
  source states a numeric boolean-prop limit.
- `[OFFICIAL]` **Serializability is a new hard constraint in the RSC era:** *"Props passed to Client
  Components need to be serializable by React."* A prop boundary that previously worked (a function,
  a class instance) now forces either a split or moving the logic across the boundary.

## The design-system boundary (R7)

`[CONVENTION]` shadcn/ui's model: *"This is not a component library. It is how you build your
component library."* The code lives in your repo and is open for modification, which *"eliminates
workarounds, style overrides, or component wrapping."*

`[CONVENTION]` FSD gives the usable test: shared UI *"should not contain business logic, but it's
okay for them to be business-themed."*

- ✅ `<PriceTag value={…} />` in the design system
- 🔴 `<CheckoutPriceTag />` that reads the cart store

`[CONVENTION]` What keeps app code off raw primitives is the public-API rule: *"Modules outside of
this slice/segment can only reference the public API, not the internal file structure."*

`[OFFICIAL]` If the design system is a published package, `"use client"` goes at its **entry
points** — *"This lets your users import components into Server Components without needing to create
wrappers."*

## Server Components change what "splitting" means · `[OFFICIAL]`

RSC gives the first officially-documented reason to split a component on a **non-readability**
criterion.

The mechanism, verbatim:

> *"Once a file is marked with `"use client"`, **all of its imports and the components it directly
> renders are included in the client bundle**."*

…but:

> *"It does not apply to Server Components passed as children or other props. Those components are
> not imported into the Client Component's module graph."*

That asymmetry is the whole architecture:

- **Split to the leaf.** *"add `'use client'` to specific interactive components instead of marking
  large parts of your UI as Client Components."*
- **Use a `children` slot** when an interactive component must wrap server content — the documented
  example is a server-fetching `<Cart>` inside a client `<Modal>`.
- **Providers as deep as possible.** *"notice how `ThemeProvider` only wraps `{children}` instead of
  the entire `<html>` document."* Isolate all client providers in one `provider.tsx` so the root
  layout stays a Server Component.
- **Wrap third-party client-only components** in a one-line `'use client'` re-export file — a
  component split created purely by the boundary.
- `'use client'` must be *"at the very beginning of a file, above any imports or other code"*.
- `[OFFICIAL]` There is **no directive for Server Components**. `"use server"` is for Server Actions
  only.

**Checkable:** `'use client'` appearing in a `layout.tsx` or `page.tsx` is a smell — move it to the
interactive leaf, or give the leaf a `children` slot.

Because the directive is transitive over imports, a single `useState` deep in an imported helper
silently client-ifies everything above it in that module graph. "Does this file import anything
client-only?" is a **file-placement** question, not just a component-design one.

`[HOUSE]` "Client component tree poisoning" is community vocabulary for the documented module-graph
rule. Do not quote it as official.

## Anti-patterns · with their enforcement

| Anti-pattern | Tier | Enforced by |
|---|---|---|
| Component defined inside a component | `[OFFICIAL]` | `react/no-unstable-nested-components` |
| Anonymous default-exported component | `[OFFICIAL]` | lint/review |
| Prop drilling through non-consumers | `[OFFICIAL]` | review — it signals a missed extraction |
| Reaching for Context because of depth alone | `[OFFICIAL]` | review |
| Over-used prop spreading | `[OFFICIAL]` | review |
| HOC applied inside render | `[OFFICIAL, legacy]` | review |
| Barrel files inside app code | `[CONVENTION]`/`[OPINION]` | `import/no-cycle` |
| Cross-feature imports | `[CONVENTION]` | `import/no-restricted-paths` |
| Reaching into a slice's internals | `[CONVENTION]` | `boundaries/entry-point` |
| Server-only code imported into a client module | `[OFFICIAL]` | `server-only` → build error |
| Component that fetches AND renders AND formats | `[HOUSE]` | review |

The last one is not named as an anti-pattern by any source. It is the conjunction of react.dev's
one-concern rule and the RSC boundary — and in the App Router it is additionally *structurally*
discouraged, since a component that calls `useState` cannot `await` a fetch.

"God component" has **no** quantitative definition in any primary source; the term itself did not
appear in one.
