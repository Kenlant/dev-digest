# `@devdigest/api` — server map

Fastify backend: imports repos/PRs, indexes them (`repo-intel`), stores
agents, runs `reviewer-core`. See [`README.md`](README.md) for the full
request/DI flow diagrams.

**Before working here, read [`INSIGHTS.md`](INSIGHTS.md)** — treat it as
high-confidence guidance from past sessions unless told otherwise.

## Stack

Fastify 5.2 · Drizzle ORM 0.38 + `postgres` (pgvector) · `fastify-type-provider-zod`
4.0 (Zod 3.24 schemas double as validation + response serialization) ·
`fastify-sse-v2` (run-trace streaming) · Vitest 2.1 · tsx (dev runner).

## Commands

`pnpm dev` (`:3001`) · `pnpm build` / `pnpm start` · `pnpm typecheck` ·
`pnpm lint` (ESLint, flat config in `eslint.config.js`) · `pnpm test` (unit:
`vitest run --exclude '**/*.it.test.ts'`, DB integration: `vitest run
.it.test`) · `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:seed`.

## Map

- `modules/<name>/routes.ts` — one Fastify plugin per feature domain (repos,
  pulls, reviews, agents, repo-intel, settings, workspace, polling)
- `db/` — Drizzle `schema/`, `migrations/`, `client.ts`, `seed.ts`
- `adapters/` — ports behind DI: llm, github, git, astgrep, codeindex,
  depgraph, embedder, secrets, tokenizer, auth (+ `mocks.ts` for tests)
- `platform/` — `container.ts` (DI), `config.ts`, `errors.ts`, `sse.ts`,
  `model-router.ts`, `price-book.ts`, prompt/grounding/structured glue
- `prompts/` — onboarding system prompt (Markdown)
- `vendor/shared` — canonical `@devdigest/shared` contracts (see root
  `CLAUDE.md` do-not-touch note)

## Non-default conventions

- Routes declare zod `params`/`body` schemas; invalid input is rejected with
  `422` **before** the handler runs — don't hand-roll `Schema.parse(req.body)`.
- Every adapter (LLM, GitHub, git, …) sits behind `platform/container.ts`;
  swap in `adapters/mocks.ts` in tests, never mock at the module level.
- Plugins (helmet/cors/rate-limit/SSE/error-handler) register **before**
  feature modules so encapsulated module plugins inherit them.
- Modules are registered statically in `modules/index.ts` — one import + one
  `app.register` per module, nothing dynamic.

## Naming conventions

- Feature modules: `modules/<kebab-case-name>/routes.ts`, one Fastify plugin
  per domain — the folder name is the domain name (`pulls`, `repo-intel`).
- DB schema files: `db/schema/<concern>.ts`, one file per bounded concern
  (`agents.ts`, `ci.ts`, `core.ts`), not one file per table.
- Repositories: `<domain>.repo.ts` (e.g. `run.repo.ts`) inside
  `modules/<name>/repository/`.
- Adapters: `adapters/<port>/` per port (llm, github, git, …), with
  `mocks.ts` at the `adapters/` root providing every port's test double.
- See root [`CLAUDE.md`](../CLAUDE.md#naming-conventions) for cross-package
  rules.

## Gotchas

- `GITHUB_TOKEN` is canonical; `GITHUB_PAT` is accepted only as a fallback.
- `EMBEDDINGS_ENABLED=false` (default) means **zero** OpenAI calls, even with
  a key set.
- `REPO_INTEL_ENABLED=true` (default) enriches the review prompt with a repo
  map — but that section stays empty until the repo is actually indexed.
- Global rate limit (120/min) is disabled under `NODE_ENV=test`.

## Read when…

- API/DI/request flow diagrams → [`README.md`](README.md)
- DI container, ports/adapters, module registration → [`docs/architecture.md`](docs/architecture.md)
- The review flow's full contract (trigger → cost → reads) → [`specs/review-flow.md`](specs/review-flow.md)
- Repo indexing internals → [`src/modules/repo-intel/README.md`](src/modules/repo-intel/README.md)

## End of session

Wrapping up a substantive session? Run `/engineering-insights` (or let it
auto-trigger) to update `INSIGHTS.md` — don't skip this step.
