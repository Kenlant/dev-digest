# References

External sources behind the rules in [`SKILL.md`](SKILL.md). Our layering is a
pragmatic subset of these ideas, not a literal implementation of any one of
them — each entry notes what we actually took from it.

## Onion Architecture fundamentals

- [Jeffrey Palermo — The Onion Architecture, part 1](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/)
  and [part 2](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-2/) —
  the original 2008 articles. Source of the single rule we care about: the
  domain declares the interfaces, infrastructure is externalized.
- [Herberto Graça — Onion Architecture](https://herbertograca.com/2017/09/21/onion-architecture/) —
  the clearest walkthrough of the rings and how they relate to DDD.
- [Chop Onions Instead of Layers](https://www.methodsandtools.com/archive/onionsoftwarearchitecture.php) —
  why "layers" framing misleads people into a top-down stack.
- [Onion Architecture in Software Development](https://codefinity.com/blog/Onion-Architecture-in-Software-Development)
- [Understanding Onion Architecture: A Clean Approach to Software Design](https://medium.com/lets-code-future/understanding-onion-architecture-a-clean-approach-to-software-design-f41af77b72d8)

## Dependency Inversion

The mechanism behind "arrows point inward only", and the reason
`platform/container.ts` is the only place a concrete adapter is constructed.

- [Dependency inversion principle (Wikipedia)](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
- [Dependency Inversion & Ports/Adapters — Synapse Studios](https://docs.synapsestudios.com/concepts/architecture/dependency-inversion.html)
- [Demystifying the Dependency Inversion Principle in Clean Architecture](https://arthcruz.dev/en/posts/demystifying_the_dependency_inversion_principle_in_clean_architecture/)

## Rich vs. anemic domain models

The argument against `deriveReviewStatus(args: {...})` in
`modules/pulls/status.ts` — see [`examples.md`](examples.md) #1.

- [Martin Fowler — AnemicDomainModel](https://martinfowler.com/bliki/AnemicDomainModel.html) —
  the canonical statement: separating data from the process over it is
  "just a procedural style design".
- [Milan Jovanović — Refactoring From an Anemic to a Rich Domain Model](https://milanjovanovic.tech/blog/refactoring-from-an-anemic-domain-model-to-a-rich-domain-model) —
  the concrete refactor sequence our Tier 2 rule describes.
- [SSW — Anemic vs rich domain models](https://www.ssw.com.au/rules/anemic-vs-rich-domain-models)
- [Rich vs Anemic Domain Models in DDD](https://jordansrowles.medium.com/rich-vs-anemic-domain-models-in-domain-driven-design-8322c385f6ad)

## Onion vs. Clean vs. Hexagonal

Why our `adapters/` + `platform/container.ts` is an onion-flavored
ports-and-adapters design and not a different pattern — three schools, largely
one dependency rule.

- [Milan Jovanović — Clean Architecture vs Onion vs Hexagonal](https://milanjovanovic.tech/blog/clean-architecture-vs-onion-vs-hexagonal)
- [Onion vs Clean vs Hexagonal Architecture](https://medium.com/@edamtoft/onion-vs-clean-vs-hexagonal-architecture-9ad94a27da91)
- [Understanding Hexagonal, Clean, Onion, and Traditional Layered Architectures](https://romanglushach.medium.com/understanding-hexagonal-clean-onion-and-traditional-layered-architectures-a-deep-dive-c0f93b8a1b96)

## Onion in Node.js / TypeScript

- [Onion Architecture in Node.js with TypeScript](https://sankhadip.medium.com/onion-architecture-in-node-js-with-typescript-5508612a4391)
- [Implementing SOLID and the onion architecture in Node.js with TypeScript and InversifyJS](https://dev.to/remojansen/implementing-the-onion-architecture-in-nodejs-with-typescript-and-inversifyjs-10ad) —
  useful for the port/adapter shapes; we deliberately use a hand-rolled
  container instead of an IoC library.
- [Melzar/onion-architecture-boilerplate](https://github.com/Melzar/onion-architecture-boilerplate) —
  a full folder layout to compare ours against.

## Repository pattern + Drizzle

Grounds the row ↔ entity mapping at the infrastructure boundary.

- [Atomic Repositories in Clean Architecture and TypeScript — Sentry](https://blog.sentry.io/atomic-repositories-in-clean-architecture-and-typescript/) —
  source of our transaction rule: pass `tx` down, `const invoker = tx ?? db`,
  rather than leaking a Drizzle client into application code.
- [Repository Pattern with Drizzle ORM](https://medium.com/@vimulatus/repository-pattern-in-nest-js-with-drizzle-orm-e848aa75ecae) —
  Drizzle-specific repository shape.
- [Khalil Stemmler — DTOs, Mappers & the Repository Pattern](https://khalilstemmler.com/articles/typescript-domain-driven-design/repository-dto-mapper/) —
  the explicit mapper layer our `toPull(row)` helpers are.
- [Drizzle ORM Best Practices](https://paulserban.eu/blog/post/drizzle-orm-best-practices-principles-patterns-and-real-world-case-studies/) —
  on not exposing database types to API layers; directly describes what
  `server/src/db/rows.ts` does today.
- [You might not need… the repository pattern](https://dev.to/jayfreestone/you-might-not-need-the-repository-pattern-46b) —
  kept deliberately as the counterpoint. Read it before wrapping a
  single-query helper with no behavior around it. It does not override Tier 1.

## Zod at the boundary

- [Building a bulletproof boundary with Zod DTOs](https://joshkaramuth.com/blog/tanstack-zod-dto/) —
  DTOs at the edge as an anti-corruption layer, so validation concerns don't
  leak into business logic. Why `domain/` may not import `zod`.
- [Zod — for library authors / Standard Schema](https://zod.dev/library-authors) —
  on not making a validation library a runtime identity contract between layers.

## Fastify — the actual mechanism of our interface ring

- [The hitchhiker's guide to plugins](https://fastify.dev/docs/latest/Guides/Plugins-Guide/)
- [Encapsulation reference](https://fastify.dev/docs/latest/Reference/Encapsulation/) —
  why cross-cutting plugins must register before feature modules.
- [The complete guide to the Fastify plugin system — NearForm](https://nearform.com/digital-community/the-complete-guide-to-fastify-plugin-system/)
- [fastify/fastify-awilix](https://github.com/fastify/fastify-awilix) —
  the DI route we did **not** take. Our `platform/container.ts` is the
  hand-rolled equivalent; useful if we ever outgrow it.

## Machine enforcement

- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) ·
  [rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md) —
  our gate. Already a `server/` dependency (it also powers the `depgraph`
  adapter that analyses *user* repos for `repo-intel`).
- [Validate Dependencies According to Clean Architecture](https://betterprogramming.pub/validate-dependencies-according-to-clean-architecture-743077ea084c) —
  the forbidden-rule set we modeled `.dependency-cruiser.cjs` on.
- [Avoid Cross Module Dependencies with Dependency Cruiser](https://dev.to/jacobandrewsky/avoid-cross-module-dependencies-with-dependency-cruiser-3b0b) —
  minimal `from`/`to` path-regex examples.
- [dependency-cruiser config for a layered NestJS app — Synapse Studios](https://docs.synapsestudios.com/implementation/frameworks/nest/dependency-cruiser-config) —
  including "inbound adapters must not know the domain directly".
- [How We Enforce Architecture Boundaries at Scale — lastminute.com](https://technology.lastminute.com/how-we-enforce-architecture-boundaries-at-scale-on-our-app/) —
  on surfacing violations in the PR rather than in a wiki page.
- [How to Actually Enforce Clean Architecture in TypeScript](https://dev.to/argsoftware/how-to-actually-enforce-clean-architecture-in-typescript-1o4a) —
  source of the warning we repeat in SKILL.md: a check that inspected zero
  files is worse than no check. Our `domain-is-pure` rule matches nothing until
  a `domain/` folder exists.
- [ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS) ·
  [npm `archunit`](https://www.npmjs.com/package/archunit) — the alternative we
  skipped because it needs a new dependency. Worth revisiting if we want layer
  rules as Vitest tests with cohesion/complexity metrics.
- [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) —
  the ESLint route to the same thing, also a new dependency. We use plain
  `no-restricted-imports` in `reviewer-core` instead, to protect its
  two-runtime-dependency property.
- [6 Tools for Enforcing Good Web Architecture](https://jmulholland.com/architecture-tools/)

## On not over-applying this

- [Architectures in Comparison: Onion or Vertical Slice?](https://www.csa.ch/en/blog/architectures-in-comparison-onion-or-vertical-slice)
- [CodeOpinion — Vertical Slice Architecture myths](https://codeopinion.com/vertical-slice-architecture-myths-you-need-to-know/) —
  dependency direction and code organization are orthogonal concerns. This is
  the justification for our two-tier rule: Tier 1 (direction) is absolute,
  Tier 2 (a rich domain model) is triggered by touching a business rule.
- [The Problem with Clean Architecture: Vertical Slices](https://medium.com/design-microservices-architecture-with-patterns/the-problem-with-clean-architecture-vertical-slices-111537c0ffcb)
