# DevDigest — repo map

Local-first AI PR-review tool. Course starter template — see
[`README.md`](README.md) for the full architecture and quick start.

## Stack & commands

Node ≥22 · pnpm ≥10 · Docker (Postgres only). `./scripts/dev.sh` brings up
everything (Postgres → migrate → seed → API + web). Only Postgres runs in
Docker; API and web run on the host via `pnpm dev` inside each package.

## Map

Four **standalone** packages — no pnpm/yarn workspace, each has its own
`package.json` + lockfile:

- `server/` — `@devdigest/api`, Fastify + Drizzle/Postgres backend, `:3001`
- `client/` — `@devdigest/web`, Next.js 15 studio UI, `:3000`
- `reviewer-core/` — `@devdigest/reviewer-core`, pure review engine (diff → LLM → findings)
- `e2e/` — `@devdigest/e2e`, deterministic browser e2e (no LLM)
- `server/src/vendor/shared` — `@devdigest/shared`, Zod contracts used across packages

## Non-default conventions

- No monorepo tool. Cross-package code is shared via **tsconfig path aliases**
  pointing into `vendor/` folders, not published npm packages.
- Secrets (LLM keys, `GITHUB_TOKEN`) live in `~/.devdigest/secrets.json`
  (mode `0600`), never in git or the database.
- DB migrations are **not** applied on boot — run `pnpm db:migrate` explicitly.

## Do-not-touch / drift risk

- `server/src/vendor/shared` is the canonical shared-contracts source;
  `reviewer-core` aliases it directly and CI (`reviewer-core.yml`) watches it
  via a path filter.
- `client/src/vendor/shared` is a **separate manual copy** of the same
  contracts — no automated sync, no CI drift check. Changing a contract means
  editing both copies by hand.

## Read when…

- Full architecture, ports, outbound calls → [`README.md`](README.md)
- Test/CI strategy across all packages → [`TESTING.md`](TESTING.md)
- Built-in reviewer agent prompt design → [`docs/agent-prompts/`](docs/agent-prompts/)
- Working inside the backend → [`server/CLAUDE.md`](server/CLAUDE.md)
- Working inside the web app → [`client/CLAUDE.md`](client/CLAUDE.md)
- Working on the review engine → [`reviewer-core/CLAUDE.md`](reviewer-core/CLAUDE.md)
- Working on browser e2e → [`e2e/CLAUDE.md`](e2e/CLAUDE.md)
