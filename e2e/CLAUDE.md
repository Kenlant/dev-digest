# `@devdigest/e2e` — e2e map

Deterministic browser e2e for the DevDigest web app, driven by Vercel
agent-browser over CDP. No Playwright, no LLM. See [`README.md`](README.md)
for the flow-spec convention.

**Before working here, read [`INSIGHTS.md`](INSIGHTS.md)** — treat it as
high-confidence guidance from past sessions unless told otherwise.

## Stack

tsx (runner, no build step) · Vercel `agent-browser` (CDP-driven, not
Playwright/Puppeteer) · plain JSON flow specs (no test framework DSL).

## Commands

`pnpm test` (`tsx run.ts`) · `pnpm e2e:hermetic` (`../scripts/e2e.sh`, full
stack from scratch) · `pnpm typecheck`.

## Map

- `run.ts` — the single entry point; loads and executes flow specs
- `specs/*.flow.json` — one JSON flow per user journey (`01-app-boot`,
  `02-repo-pulls-detail`, `03-agents`, `04-pr-findings`, `05-pr-diff`,
  `06-onboarding`, `07-settings`)
- `lib/assert.ts` — assertion helpers used inside flow specs

## Non-default conventions

- Flows are declared as **data** (JSON), not code — a new journey is a new
  `NN-name.flow.json` file, not a new TS test file.
- This suite is the **only** one requiring the full live stack (Postgres +
  API + web app all running); everything else in the repo mocks or stubs
  those. Don't add a "unit-style" test here — that belongs in `client/` or
  `server/`.
- No LLM is called — flows assert on deterministic UI state, not model output.

## Gotchas

- If the stack isn't up (`../scripts/dev.sh` or `pnpm e2e:hermetic`), every
  flow fails at the first navigation step, not with a clear "stack down" error.
- Flow specs are numbered by intended run order (`01`, `02`, …) — check
  `run.ts` before assuming they're independent.

## Read when…

- Flow-spec format and runner details → [`README.md`](README.md)
- Deeper design notes (as they accumulate) → [`docs/`](docs/)

## End of session

Wrapping up a substantive session? Run `/engineering-insights` (or let it
auto-trigger) to update `INSIGHTS.md` — don't skip this step.
