# DevDigest — repo map

Local-first AI PR-review tool. Course starter template — see
[`README.md`](README.md) for the full architecture and quick start.

## Stack & commands

Node ≥22 · pnpm ≥10 (`server/`, `client/`) / npm (`reviewer-core/`, `e2e/` —
see their lockfiles) · Docker (Postgres only). `./scripts/dev.sh` brings up
everything (Postgres → migrate → seed → API + web). Only Postgres runs in
Docker; API and web run on the host via `pnpm dev` inside each package.

Every package exposes the same three check commands — `test`, `typecheck`,
`lint` — run from inside that package's directory (`pnpm lint` / `npm run
lint`, etc.). See each package's own `AGENTS.md` for exact invocations.

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

## Naming conventions

- **Packages/folders**: kebab-case (`reviewer-core`, `repo-intel`). Fastify
  feature modules under `server/src/modules/<name>/` and client route groups
  under `client/src/app/<name>/` follow the same kebab-case rule.
- **TS/TSX source files**: camelCase for plain modules (`prompt.ts`,
  `grounding.ts`, `run.repo.ts`); PascalCase only for a file whose default
  export is a React component, matching its component name (`RunHistory.tsx`,
  `FindingCard.tsx`).
- **React component folders** (`client/src/app/**/_components/<Name>/`):
  PascalCase folder matching the component, containing `<Name>.tsx` +
  `<Name>.test.tsx` colocated — never a bare `.tsx` file outside a folder for
  anything with its own test.
- **Hooks**: one file per data domain in `client/src/lib/hooks/<domain>.ts`
  (e.g. `reviews.ts`, `agents.ts`), exporting `use<Thing>()` functions.
- **e2e flow specs**: `NN-name.flow.json`, zero-padded and numbered by
  intended run order (`01-app-boot.flow.json`).
- **DB schema modules** (`server/src/db/schema/*.ts`): one file per bounded
  concern, named after it (`agents.ts`, `ci.ts`), not per table.

## Do-not-touch / drift risk

- `server/src/vendor/shared` is the canonical shared-contracts source;
  `reviewer-core` aliases it directly and CI (`reviewer-core.yml`) watches it
  via a path filter.
- `client/src/vendor/shared` is a **separate manual copy** of the same
  contracts — no automated sync, no CI drift check. Changing a contract means
  editing both copies by hand.
- **DB migrations** (`server/src/db/migrations/*`): generated output from
  `drizzle-kit generate`, applied only by `pnpm db:migrate`. Never hand-edit
  an already-applied migration file — it's an append-only history of what ran
  against real databases; fix forward with a new migration instead.
- **Lock files** (`server/pnpm-lock.yaml`, `client/pnpm-lock.yaml`,
  `reviewer-core/package-lock.json`, `e2e/package-lock.json`): never hand-edit
  — always regenerate via the package's own install command
  (`pnpm install` / `npm install`) inside that package's directory. Each
  package uses the lockfile format tracked in git for it — don't switch a
  package's package manager.

## Read when…

- Full architecture, ports, outbound calls → [`README.md`](README.md)
- Test/CI strategy across all packages → [`TESTING.md`](TESTING.md)
- Built-in reviewer agent prompt design → [`docs/agent-prompts/`](docs/agent-prompts/)
- Working inside the backend → [`server/AGENTS.md`](server/AGENTS.md)
- Working inside the web app → [`client/AGENTS.md`](client/AGENTS.md)
- Working on the review engine → [`reviewer-core/AGENTS.md`](reviewer-core/AGENTS.md)
- Working on browser e2e → [`e2e/AGENTS.md`](e2e/AGENTS.md)
