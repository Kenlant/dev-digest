# Examples

Every "before" below is real code in this repository, cited by `path:line` as of
2026-09-25. The "after" is the target shape, at pseudocode fidelity — names are
suggestions, the ring each thing lives in is not.

---

## 1. Anemic business rule → domain entity method

The PR staleness rule and the "head moved since last review" rule are *the*
invariants of a pull request. They live as a free function over a bag of
primitives, with the policy constant next to it.

**Before** — `server/src/modules/pulls/status.ts:14,40-55`

```ts
export const STALE_DAYS = 7;

export function deriveReviewStatus(args: {
  ghStatus: string;            // stringly-typed: this is a GitHub merge state
  lastReviewedSha: string | null;
  headSha: string;
  updatedAt: Date | null;
  now: number;
  staleDays?: number;
}): PrStatus {
  const { ghStatus, lastReviewedSha, headSha, updatedAt, now } = args;
  if (ghStatus === 'merged' || ghStatus === 'closed') return ghStatus as PrStatus;
  if (!lastReviewedSha || lastReviewedSha !== headSha) return 'needs_review';
  const staleMs = (args.staleDays ?? STALE_DAYS) * 86_400_000;
  if (updatedAt && now - updatedAt.getTime() > staleMs) return 'stale';
  return 'reviewed';
}
```

The caller proves the coupling — `server/src/modules/pulls/routes.ts:192-198`
feeds raw Drizzle row fields in from inside the HTTP handler:

```ts
deriveReviewStatus({
  ghStatus: r.status, lastReviewedSha: r.lastReviewedSha,
  headSha: r.headSha, updatedAt: r.updatedAt, now,
})
```

**After** — `server/src/modules/pulls/domain/pull.ts`

```ts
// No imports from drizzle-orm, zod, @devdigest/shared, db/*, adapters/*.
export type ReviewFreshness = 'needs_review' | 'reviewed' | 'stale';
export type MergeState = 'open' | 'merged' | 'closed';

const STALE_AFTER_MS = 7 * 86_400_000;

export class Pull {
  private constructor(
    private readonly mergeState: MergeState,
    private readonly headSha: string,
    private readonly lastReviewedSha: string | null,
    private readonly updatedAt: Date | null,
  ) {}

  /** Built at the infrastructure boundary, from a repository row. */
  static rehydrate(input: {
    mergeState: MergeState; headSha: string;
    lastReviewedSha: string | null; updatedAt: Date | null;
  }): Pull {
    if (!input.headSha) throw new Error('Pull requires a head sha');
    return new Pull(input.mergeState, input.headSha, input.lastReviewedSha, input.updatedAt);
  }

  /** The rule, owned by the thing it is about. */
  reviewStatus(now: number, staleAfterMs = STALE_AFTER_MS): MergeState | ReviewFreshness {
    if (this.mergeState !== 'open') return this.mergeState;
    if (this.lastReviewedSha !== this.headSha) return 'needs_review';
    if (this.updatedAt && now - this.updatedAt.getTime() > staleAfterMs) return 'stale';
    return 'reviewed';
  }
}
```

Call site becomes `Pull.rehydrate(row).reviewStatus(now)`. `MergeState` as a
union instead of `ghStatus: string` removes the `as PrStatus` cast entirely —
the cast was the type system reporting the missing domain type.

`rollupSeverities()` in the same file (`status.ts:23-31`) tallies
`{ severity: string }[]`. Same treatment: a `SeverityCounts` value object
constructed from a `Severity` union, so `'CRITICAL'` is not a bare string in
three places.

**Test** — no Docker. `server/test/pulls-status.test.ts` already does this for
the free function; the entity version keeps the same test shape.

---

## 2. Drizzle in the Fastify handler → repository returning entities

**Before** — `server/src/modules/pulls/routes.ts:3,6` plus inline queries at
`:28-31`, `:47-73`, `:80-83`, `:97-104`, `:118-122`, `:134-141`, `:337-343`

```ts
import { and, desc, eq, inArray, sum } from 'drizzle-orm';
import * as t from '../../db/schema.js';
// ... 5 handlers, each with its own db.select()
```

Same shape in `modules/polling/routes.ts:3-4`, `modules/workspace/routes.ts:2-3`,
`modules/settings/routes.ts:3,10`.

**After**

```ts
// modules/pulls/domain/ports.ts — the domain declares what it needs
export interface PullRepositoryPort {
  listForRepo(repoId: string): Promise<Pull[]>;
  findById(workspaceId: string, id: string): Promise<Pull | null>;
}

// modules/pulls/repository/pull.repo.ts — infrastructure implements it
export class DrizzlePullRepository implements PullRepositoryPort {
  constructor(private readonly db: Db) {}

  async findById(workspaceId: string, id: string): Promise<Pull | null> {
    const [row] = await this.db.select().from(t.pullRequests)
      .where(and(eq(t.pullRequests.workspaceId, workspaceId), eq(t.pullRequests.id, id)));
    return row ? toPull(row) : null;   // map at the boundary — row stops here
  }
}

// modules/pulls/routes.ts — no drizzle-orm import anywhere
app.get('/pulls/:id', { schema: { params: IdParams } }, async (req) => {
  const { workspaceId } = await getContext(container, req);
  const pull = await service.get(workspaceId, req.params.id);
  return toPullDto(pull);
});
```

---

## 3. Drizzle row types in the application layer's signatures

**Before** — `server/src/modules/reviews/service.ts:4,47-50,103-108`

```ts
import type { AgentRow } from '../../db/rows.js';

async resolveTargets(workspaceId: string, opts: {...}): Promise<AgentRow[]> { ... }
async runReview(workspaceId: string, prId: string, targets: AgentRow[], log: Logger) { ... }
```

`modules/reviews/routes.ts:33-42` then takes `targets` out of `resolveTargets`
and passes it to `runReview` — Drizzle rows crossing the HTTP boundary's object
graph. Same pattern in `run-executor.ts:58,141` and `diff-loader.ts:17`
(`repo: typeof schema.repos.$inferSelect`).

And `server/src/db/rows.ts:12-16` is the file that makes this normal:

```ts
export type AgentRow = typeof t.agents.$inferSelect;
export type PullRow  = typeof t.pullRequests.$inferSelect;
// ... exported precisely so other modules can consume row shapes
```

**After**

```ts
// modules/reviews/domain/review-target.ts
export class ReviewTarget {
  private constructor(readonly agentId: string, readonly name: string, readonly model: ModelChoice) {}
  static rehydrate(input: { agentId: string; name: string; model: ModelChoice }) { ... }
}

// modules/reviews/service.ts — no db/rows import
async resolveTargets(workspaceId: string, opts: {...}): Promise<ReviewTarget[]>
async runReview(workspaceId: string, prId: string, targets: ReviewTarget[], log: Logger)
```

`agentsRepo` maps `agents.$inferSelect` → `ReviewTarget` inside its `.repo.ts`.
Do not add new types to `db/rows.ts`; remove a consumer each time you touch one.

Remember the **two-layer trap**: `modules/reviews/repository.ts:34-40` returns
`typeof t.repos.$inferSelect` from wrapper methods, independently of what
`repository/*.repo.ts` returns. Both signatures need the change.

---

## 4. Wide shared port → narrow domain-declared port

**Before** — `server/src/vendor/shared/adapters.ts:2-7,144-145`: the outbound
port is typed by transport DTOs, so the port speaks the GitHub API's language.

```ts
import type { PrMeta, PrDetail, IssueMeta, PrReviewComment } from './contracts/platform.js';

export interface GitHubClient {
  listPullRequests(repo: RepoRef): Promise<PrMeta[]>;
  getPullRequest(repo: RepoRef, number: number): Promise<PrDetail>;
  // ...
}
```

`server/INSIGHTS.md` records the cost: adding a required field to `PrMeta` breaks
`adapters/github/octokit.ts` **and** `adapters/mocks.ts`.

**After**

```ts
// modules/pulls/domain/ports.ts — only what this use case needs
export interface PullSourcePort {
  fetchOpenPulls(repo: { owner: string; name: string }): Promise<Pull[]>;
}

// adapters/github/octokit.ts — one adapter, both contracts
export class OctokitGitHubClient implements GitHubClient, PullSourcePort {
  async fetchOpenPulls(repo): Promise<Pull[]> {
    const metas = await this.listPullRequests(repo);
    return metas.map(toPull);          // DTO → entity here, in infrastructure
  }
}

// modules/pulls/service.ts — depends on the narrow port only
constructor(private readonly source: PullSourcePort, private readonly repo: PullRepositoryPort) {}
```

The wide `GitHubClient` stays — `adapters/mocks.ts` and Octokit already
implement it. The point is which one the service's constructor names.

---

## 5. Zod DTO straight into SQL

**Before** — `server/src/modules/settings/routes.ts:49-59`

```ts
app.put('/settings', { schema: { body: SettingsUpdate } }, async (req) => {
  const body = req.body;
  for (const [key, value] of Object.entries(body)) {
    await container.db.insert(t.settings)
      .values({ workspaceId, userId, key, value })
      .onConflictDoUpdate({ ... });
  }
```

Wire DTO → SQL with nothing in between, inside the handler. Softer version at
`modules/agents/routes.ts:114` (`service.update(workspaceId, req.params.id, req.body)`),
where the only "domain step" in `agents/service.ts:96-107` is snake_case →
camelCase renaming.

Also here: `modules/reviews/routes.ts:32` hand-rolls
`RunRequest.parse(req.body ?? {})` inside the handler, which
`server/AGENTS.md` explicitly forbids — declare it in `schema: { body }` instead
so Fastify returns 422 before the handler runs.

**After**

```ts
app.put('/settings', { schema: { body: SettingsUpdate } }, async (req) => {
  const { workspaceId, userId } = await getContext(container, req);
  const patch = SettingsPatch.fromDto(req.body);      // DTO → domain, validates invariants
  const settings = await service.apply(workspaceId, userId, patch);
  return settings.toDto();                            // domain → DTO
});
```

`SettingsPatch` is where "which keys may be written, and what values are legal
together" lives — currently that rule exists nowhere, which is the actual
finding.

---

## 6. Application layer importing concrete adapter internals

**Before** — `server/src/modules/repo-intel/service.ts:22,28` (repeated in
`pipeline/full.ts:29-30` and `pipeline/incremental.ts:22-23`)

```ts
import { extractEndpoints } from '../../adapters/codeindex/extract.js';
import { parseImports, parseInvocationHeads, parseSymbols, langForFile }
  from '../../adapters/astgrep/index.js';
```

`modules/repo-intel/types.ts:1-8` already claims "features import THIS, never
the libraries" — the service violates its own module's stated rule.

Same shape in `modules/reviews/diff-loader.ts:3` (`parseUnifiedDiff` imported
from `adapters/git/diff-parser.js`) and `modules/settings/feature-models.ts:1,8`
(a "helper" that imports `drizzle-orm`'s `eq` + `db/schema` and runs its own
query at `:40-43` while taking `Container` as a parameter).

**After** — route it through a port on the container, the way `git`,
`codeIndex`, `tokenizer` and `depgraph` already are:

```ts
// the port the pipeline actually needs
export interface SourceAnalyzerPort {
  symbolsIn(file: string, text: string): Promise<CodeSymbol[]>;
  importsIn(file: string, text: string): Promise<string[]>;
}

// platform/container.ts — the only place a concrete thing is constructed
get sourceAnalyzer(): SourceAnalyzerPort {
  if (this.overrides.sourceAnalyzer) return this.overrides.sourceAnalyzer;
  this._sourceAnalyzer ??= new AstGrepAnalyzer();
  return this._sourceAnalyzer;
}
```

Add the `ContainerOverrides` slot at the same time — that's what makes the
pipeline testable without ast-grep's native binary.

---

## 7. `reviewer-core` purity

**Wrong**, anywhere in `reviewer-core/src/**` outside `llm/`:

```ts
import fs from 'node:fs';
import { Pool } from 'pg';
import { Octokit } from 'octokit';
```

**Right** — the only side effect is the injected port:

```ts
export async function runReview(diff: UnifiedDiff, llm: LLMProvider) {
  const messages = assemblePrompt(diff);
  const { value } = await llm.completeStructured({ schema: Review, messages });
  return groundFindings(value, diff);   // pure: drops uncited findings
}
```

`reviewer-core/eslint.config.js` enforces this with `no-restricted-imports`,
exempting `src/llm/**`. Its runtime dependency list is exactly `openai` + `zod`;
keep it that way.

---

## 8. The positive example — copy this one

`server/src/platform/container.ts` is the repo's best existing Onion property:
**every** concrete adapter instantiation in the entire server lives in that one
file (`:83,84,91,105,123,130,145,158,177,185,192,206` — `OpenAIProvider`,
`AnthropicProvider`, `OpenRouterProvider`, `OctokitGitHubClient`,
`SimpleGitClient`, `RipgrepCodeIndex`, `OpenAIEmbedder`, `DepCruiseGraph`,
`TiktokenTokenizer`, `LocalSecretsProvider`, `LocalNoAuthProvider`).

The getter idiom to follow when adding a port:

```ts
get tokenizer(): Tokenizer {
  if (this.overrides.tokenizer) return this.overrides.tokenizer;   // test seam first
  this._tokenizer ??= new TiktokenTokenizer();                     // lazy, cached
  return this._tokenizer;
}
```

Anything needing a secret becomes an `async` method instead (`github()`,
`llm(id)`, `embedder()`), and throws `ConfigError` *before* constructing a
client — which is how `EMBEDDINGS_ENABLED=false` guarantees zero OpenAI calls.

One gap worth closing when you hit it: `agentsRepo` and `reviewRepo` have no
`ContainerOverrides` slot, so repositories cannot be faked and those paths force
testcontainers. Add the slot rather than reaching for Docker.
