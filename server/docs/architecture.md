# Server architecture — DI container and adapters

How `@devdigest/api` is wired: one composition root, adapters behind ports,
Fastify plugins as feature boundaries.

## The DI container (`platform/container.ts`)

One `Container` instance per app instance. Holds `config`, `db`, the
`JobRunner`, and the SSE `runBus`, plus lazily-constructed adapters:

```ts
class Container {
  readonly config: AppConfig;
  readonly db: Db;
  readonly secrets: SecretsProvider;
  readonly auth: AuthProvider;
  get git(): GitClient          // SimpleGitClient(config.cloneDir)
  get codeIndex(): CodeIndex    // RipgrepCodeIndex(this.git)
  get repoIntel(): RepoIntel    // RepoIntelService(this)
  get depgraph(): DepGraph      // DepCruiseGraph()
  get tokenizer(): Tokenizer    // TiktokenTokenizer()
  get priceBook(): PriceBook    // live OpenRouter pricing + static fallback
  get agentsRepo(): AgentsRepository
  get reviewRepo(): ReviewRepository
}
```

Every adapter is exposed as a getter typed by its **port** (the interface
from `@devdigest/shared`, e.g. `GitHubClient`, `LLMProvider`, `CodeIndex`),
never by its concrete class. The getter lazily builds the real
implementation (`OctokitGitHubClient`, `RipgrepCodeIndex`, …) on first
access and caches it.

`ContainerOverrides` is the injection point for tests: pass a mock that
satisfies the port's interface, and every module that reads
`container.github` / `container.git` / `container.llm(provider)` gets the
mock without touching module code. `adapters/mocks.ts` provides one test
double per port.

## Ports and adapters (`adapters/`)

One folder per port: `llm/`, `github/`, `git/`, `astgrep/`, `codeindex/`,
`depgraph/`, `embedder/`, `secrets/`, `tokenizer/`, `auth/`. Each folder
holds the concrete implementation(s); the port's TypeScript interface lives
in `@devdigest/shared`, not in the adapter folder. `adapters/mocks.ts` at
the `adapters/` root exports every port's test double in one place.

LLM providers (`adapters/llm/openai.ts`, `adapters/llm/anthropic.ts`) sit
alongside `@devdigest/reviewer-core`'s own `OpenRouterProvider` — the
studio resolves whichever provider an agent is configured for via
`container.llm(agent.provider)`; `reviewer-core` never imports a server
adapter.

## Fastify plugin registration (`modules/`)

One Fastify plugin per feature domain, registered statically in
`modules/index.ts`:

```ts
export const modules: Record<string, FastifyPluginAsync> = {
  settings, repos, pulls, polling, workspace, agents, reviews, repoIntel,
};
```

Static registration (one import + one object entry per module) rather than
filesystem autoload, so the same code path works under `tsx` (dev),
`vitest` (tests), and the production bundle — native dynamic `import()` of
`.ts` files isn't portable across those three runners.

Cross-cutting plugins (helmet, cors, rate-limit, SSE, the error handler)
register **before** the feature modules so every module inherits them.

## Request flow example: running a review

`modules/reviews/` shows the layering used across the server:

```
routes.ts        Fastify plugin — schema validation, HTTP verbs, SSE endpoint
  → service.ts       ReviewService — orchestration, public method surface
    → run-executor.ts   ReviewRunExecutor — background execution loop
      → reviewer-core     pure engine (diff → prompt → LLM → grounding)
      → repository.ts     ReviewRepository — persistence (thin wrapper)
        → repository/*.repo.ts   Drizzle queries per entity (pull/review/run)
```

`routes.ts` never touches Drizzle directly — it calls `ReviewService`.
`ReviewService` never calls the LLM directly — it delegates the actual
review execution to `ReviewRunExecutor`, which calls
`reviewPullRequest()` from `@devdigest/reviewer-core` (the only place an LLM
call happens) and then persists the result through `ReviewRepository`.

Note the two-layer repository: `ReviewRepository` (`modules/reviews/repository.ts`)
is a thin wrapper class with its own parameter types; the actual Drizzle
queries live in `modules/reviews/repository/*.repo.ts`. A field added to a
`.repo.ts` method's type does nothing for callers unless the same field is
added to the wrapper method in `repository.ts` too (see `INSIGHTS.md`).

See [`../specs/review-flow.md`](../specs/review-flow.md) for the full
request/response contract of this flow.
