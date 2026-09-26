---
name: onion-architecture
description: "Enforces Onion Architecture on this repo's backend — a dependency-inverted domain core (entities and value objects owning business rules, plus the ports they declare) wrapped by an application layer (service.ts / run-executor.ts), wrapped by infrastructure (routes.ts, repository/*.repo.ts, adapters/*, db/schema, platform/container.ts) that implements those ports and maps Drizzle rows and Zod DTOs to and from domain entities at the boundary. Stricter than the repo's current routes→service→repository habit: no module has a domain layer yet, and pulls/polling/workspace/settings run Drizzle straight from Fastify handlers. Use proactively whenever adding or editing any file under server/src/modules/**, server/src/adapters/**, server/src/db/rows.ts, server/src/platform/container.ts, or reviewer-core/src/**, including small fixes. Trigger terms: onion architecture, layering, domain layer, domain entity, port, adapter, dependency inversion, repository boundary, anemic model, architecture boundary, depcruise, lint:arch."
metadata:
  tags: architecture, onion, ddd, layering, fastify, drizzle, zod, dependency-injection, backend
---

## Scope

`server/` (`@devdigest/api`) and `reviewer-core/` (`@devdigest/reviewer-core`).
Not `client/`, not `e2e/`.

Read first, don't duplicate: [`server/docs/architecture.md`](../../../server/docs/architecture.md)
(DI container, ports, module registration), [`server/AGENTS.md`](../../../server/AGENTS.md),
[`reviewer-core/AGENTS.md`](../../../reviewer-core/AGENTS.md) (the purity rule
this skill extends to `server/`), [`server/INSIGHTS.md`](../../../server/INSIGHTS.md).

## The four rings

```
domain/                entities + value objects owning business rules, and the
                       ports THIS module needs. Imports NOTHING from:
                       drizzle-orm · fastify · zod · @devdigest/shared ·
                       db/* · adapters/* · platform/*
  ↑
service.ts             application — orchestrates use cases over domain
run-executor.ts        entities and injected ports. No Drizzle, no Fastify,
                       no $inferSelect in any signature.
  ↑
routes.ts              interface — Fastify plugin + Zod schema. Request DTO →
                       domain entity on the way in; domain entity → response
                       DTO on the way out. Never imports drizzle-orm.
  ↑
repository/*.repo.ts   infrastructure — implements the domain's ports, maps
adapters/*             Drizzle rows ↔ entities at its own boundary. Every
platform/container.ts  `new <Concrete>` lives in container.ts, nowhere else.
db/schema/*
```

**Arrows point inward only.** Infrastructure is the only ring allowed to
import Drizzle, Octokit, the OpenAI/Anthropic SDKs or Fastify — and it does so
to *implement* an interface the domain declared, not the reverse. When a port's
shape is dictated by `@devdigest/shared` or a Drizzle row type, that is
infrastructure leaking inward.

## Two tiers — know which one applies

### Tier 1 — always, no exceptions

Mechanical, cheap, and machine-checked by `depcruise` (see **Running the gate**).
Applies to every edit, however small:

- `routes.ts` imports neither `drizzle-orm` nor `db/schema`.
- No `$inferSelect` type (directly, or via `db/rows.js`) appears in a
  `service.ts` / `run-executor.ts` signature.
- No concrete adapter class or adapter-internal function is imported outside
  `platform/container.ts` and `adapters/`.
- No `Schema.parse(req.body)` inside a handler — validation is declared in
  `schema: { params, body }` so Fastify rejects with 422 before the handler runs.
- `reviewer-core/src/**` gains no `fs` / `pg` / `drizzle-orm` / `octokit` /
  network import outside `llm/`.

### Tier 2 — mandatory when the change touches a business rule

A business rule is a status derivation, an eligibility check, a state
transition, a validation invariant, a policy constant. When you touch one, the
concept ends the change as a **domain entity or value object owning that rule**,
with a domain-declared port and row/DTO mapping at the infrastructure boundary.

Tier 2 does **not** apply to pure formatting, string/diff utilities, or
constants with no invariant attached. Domain modeling is for code that encodes
a rule, not for incidental helpers.

You convert **the concept you touched**, not the whole module. See **Stop
condition**.

## Per-tool rules

### Fastify 5 (+ `fastify-sse-v2`)

- `routes.ts` is transport only: read context, map DTO → entity, call the
  service, map entity → DTO. `modules/repos/routes.ts` already states this in
  its own header — imitate it.
- Keep one plugin per feature domain, registered statically in
  `modules/index.ts`. `@fastify/autoload` is a declared-but-unused dependency;
  do not start using it.
- Cross-cutting plugins (helmet/cors/rate-limit/SSE/error-handler) register
  before feature modules so encapsulated module plugins inherit them.
- Never construct a service inside a route plugin when the container already
  exposes it — `modules/repo-intel/routes.ts:29` does `new RepoIntelService(container)`
  alongside an existing `container.repoIntel`, creating two instances. Don't
  copy that.
- SSE is transport. Streaming a run does not entitle a handler to business logic.

### `fastify-type-provider-zod` 4 + Zod 3

- Zod contracts in `src/vendor/shared/contracts/*` are **wire DTOs**. They
  describe the HTTP boundary, not the internal working type.
- `domain/` must not import `zod` or `@devdigest/shared`. A domain invariant is
  enforced in a constructor or factory, not by a schema.
- Declare `schema: { params, body }` on the route. `modules/reviews/routes.ts:32`
  hand-rolls `RunRequest.parse(req.body ?? {})`, contradicting
  `server/AGENTS.md` — fix it when you touch that route, don't extend it.
- A parsed body is not a persistence payload. `modules/settings/routes.ts:49-59`
  loops `Object.entries(req.body)` straight into `db.insert(t.settings)`; that's
  the shape to unwind, not the pattern to follow.

### Drizzle ORM 0.38

- `$inferSelect` types stop at the edge of `repository/`. Map row → entity
  inside the `.repo.ts` file and return the entity.
- `src/db/rows.ts` institutionalizes the leak — it exports `AgentRow`,
  `PullRow`, `FindingRow`, `AgentRunRow`, `AgentVersionRow` specifically so
  other modules can consume row shapes. Treat it as debt being unwound: do not
  add a new type to it, and drop a consumer from it whenever you touch one.
- **Two-layer repository trap**: `repository.ts`'s wrapper signature is
  independent of `repository/*.repo.ts` and does not update automatically.
  Change the row→entity type in both (documented in `server/INSIGHTS.md`).
- A transaction is a port concern, not a leaked `db` handle. Pass `tx` down as
  an optional parameter (`const invoker = tx ?? db`) rather than handing
  application code a Drizzle client.

### The DI container (`platform/container.ts`)

- Ports are plain TypeScript `interface`s — no tokens, no decorators, no base
  class. Keep them that way.
- `container.ts` is the **only** file in `server/src` that may contain
  `new <ConcreteAdapter>`. It currently holds every one of them; that is the
  best Onion property this codebase already has. Preserve it.
- Services receive ports through the constructor. A service that imports
  `OctokitGitHubClient`, `SimpleGitClient` or `OpenAIProvider` is broken by
  definition.
- Prefer a **narrow, domain-declared port** over `@devdigest/shared`'s wide
  HTTP-shaped one. `GitHubClient.listPullRequests(): Promise<PrMeta[]>`
  (`vendor/shared/adapters.ts`) is typed by a transport DTO, which is why
  adding a required `PrMeta` field breaks `adapters/github/octokit.ts` *and*
  `adapters/mocks.ts` (see `server/INSIGHTS.md`). An adapter may satisfy both
  the wide contract and your narrow port; the service depends only on the narrow one.
- Tests inject through `ContainerOverrides` + `adapters/mocks.ts`. Never mock at
  the module level. Note `agentsRepo` and `reviewRepo` have **no** override
  slot — if your change needs a fake repository, add the slot rather than
  reaching for testcontainers.

### Vitest 2

- A new domain rule gets a hermetic test in `server/test/*.test.ts` — no Docker,
  no container. `server/test/pulls-status.test.ts` is the model: it imports the
  rule directly and pins a fixed clock.
- This is the whole payoff, and the repo proves it: 5 of 8 `*.it.test.ts` files
  are `pulls-*` / `settings-*` — exactly the modules whose rules sit inside
  Fastify handlers next to Drizzle calls, so they can *only* be tested against
  real Postgres. The one rule that was extracted (`pulls/status.ts`) is the one
  with a fast pure test.
- `*.test.ts` = hermetic unit; `*.it.test.ts` = real Postgres via
  `@testcontainers/postgresql`. Putting a domain rule in an `.it.test.ts` is a
  signal the rule is in the wrong ring.

### `reviewer-core`

The purity standard for the whole repo: the only side effect anywhere in the
package is `llm.completeStructured(...)` through the injected `LLMProvider`.
Its runtime dependency list is exactly `openai` + `zod` — that is an
architectural property, so do not add a dependency to make something
convenient. `npm run lint` enforces the import ban via `no-restricted-imports`.

Known drift, recorded not fixed: `reviewer-core/tsconfig.json` aliases
`@devdigest/shared` to `../server/src/vendor/shared`, so the innermost layer
resolves its contracts from inside the outermost package. Don't deepen it.

## Running the gate

From `server/`:

```bash
pnpm lint:arch                                             # the gate — new violations only
pnpm exec depcruise src --config .dependency-cruiser.cjs   # full report, baseline included
```

`.dependency-cruiser-known-violations.json` is the committed snapshot of
accepted debt. **Never grow the baseline.** When you touch a module, shrink it:
fix the violation and re-run `pnpm exec depcruise-baseline src --config .dependency-cruiser.cjs`.

Two honest limits:

- A green run **proves nothing about a module with no `domain/` yet** — the
  `domain-is-pure` rule matches zero files there. A rule that inspects nothing
  is worse than no rule; don't read green as "layering is fine."
- depcruise checks **imports**, not semantics. It cannot see a business rule
  written as a free function, an entity with no invariants, or a
  `Object.entries(req.body)` loop. Tier 2 is on you; the gate only holds Tier 1.

The CI step is inlined in `.github/workflows/server-unit.yml` rather than
calling `pnpm lint:arch`, matching how that workflow already invokes vitest.

For `reviewer-core/`: `npm run lint`.

## Current state — no module is a baseline to copy

`domain/` exists in **zero** modules. Positions differ, none is correct:

| Module | Shape today |
|---|---|
| `repos` | routes → service → repository. Best-layered; still no domain layer. |
| `agents` | routes → service → repository; row⇄DTO map + version-bump rule as free functions in `helpers.ts`. |
| `reviews` | routes → service → run-executor → 2-layer repository; `AgentRow` in the service's public signatures. |
| `repo-intel` | routes → service → repository; service imports concrete adapter functions directly. |
| `pulls` | **No service, no repository.** Drizzle in 5 handlers; only `status.ts` extracted. |
| `settings` | **No service.** Drizzle in handlers; `feature-models.ts` queries the DB while taking `Container`. |
| `polling` | **No service.** Drizzle + GitHub sync inline in the handler. |
| `workspace` | **No service.** One Drizzle select + inline row→DTO map in the handler. |

`server/docs/architecture.md` asserts "`routes.ts` never touches Drizzle
directly". That is true of `modules/reviews` only — treat the doc's diagram as
the target, not a description.

`modules/_shared/` (`context.ts`, `schemas.ts`) is cross-cutting interface glue,
not a feature module. It needs no `domain/`.

## Why

Palermo's point in the original Onion articles is that the domain declares the
interfaces and infrastructure implements them, so business rules stay testable
without a database and stable while adapters churn. Fowler's anemic-domain-model
objection is the other half: a rule expressed as a free function over a loose
args bag can be re-implemented slightly differently at a second call site, while
a rule that is a method on an entity cannot. `deriveReviewStatus(args: {...})`
in `modules/pulls/status.ts` is this repo's clearest instance of the anemic
shape — the PR staleness and "head moved" invariants belong to a `Pull`.

Sources in [`references.md`](references.md).

## Stop condition

Stop when the concept you touched has: a domain entity or value object owning
its rule, a port the domain declares, infrastructure implementing that port with
row/DTO mapping at the boundary, and a hermetic test. Do not convert parts of
the module you had no other reason to touch, and do not grow the depcruise
baseline.

Before/after pairs for every rule above: [`examples.md`](examples.md).
