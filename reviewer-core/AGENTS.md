# `@devdigest/reviewer-core` — engine map

Pure review logic: diff → prompt → LLM → grounded findings. No database,
GitHub, or filesystem access. See [`README.md`](README.md) for the pipeline
diagram.

**Before working here, read [`INSIGHTS.md`](INSIGHTS.md)** — treat it as
high-confidence guidance from past sessions unless told otherwise.

## Stack

TypeScript, no framework. Zod 3.24 (contracts + JSON-Schema generation) ·
`openai` SDK (used as the LLM client shape, provider-agnostic via
`LLMProvider`) · Vitest 2.1. Consumed by `server/` via a tsconfig path alias
(`@devdigest/reviewer-core` → `reviewer-core/src`) as TypeScript source, not a
built package.

## Commands

Package manager is **npm** here (see `package-lock.json`), not pnpm.
`npm run typecheck` (doubles as `build` — this package **never emits JS**) ·
`npm run lint` (ESLint, flat config in `eslint.config.js`) · `npm test`
(hermetic, stubbed `LLMProvider`, no keys/network).

## Map

- `prompt.ts` — `assemblePrompt()` + `wrapUntrusted()` / injection guard
- `grounding.ts` — `groundFindings()`, the mandatory citation gate vs the diff
- `llm/openrouter.ts` — the injected `LLMProvider` implementation
- `llm/structured.ts` — Zod → JSON Schema, `parseWithRepair`
- `output/to-review.ts` — CI payload shaping (`toReview()`)
- `review/run.ts` — single-pass orchestration; `review/reduce.ts` — map-reduce path
- `index.ts` — the only public surface; import from here, not internal files

## Non-default conventions

- The **only** side effect anywhere in this package is the LLM call, and only
  through an **injected** `LLMProvider` — that's what makes every unit test
  hermetic. Never add a direct network/DB/FS call.
- A finding that doesn't cite a real line in the diff is dropped by
  `groundFindings()` — the score is always recomputed from surviving
  findings, never trusted from the model's own output.
- Optional prompt slots (`skills`, `memory`, `specs`, `callers`) exist in the
  API but are unused by the starter server — `assemblePrompt` just omits
  sections for slots it isn't given.

## Naming conventions

- One file per pipeline stage, named after the verb it performs:
  `prompt.ts` (`assemblePrompt`), `grounding.ts` (`groundFindings`) — camelCase
  function names matching the file's purpose, not the file name itself.
- `llm/` holds provider implementations of the injected `LLMProvider` port
  (`llm/openrouter.ts`) plus shared LLM plumbing (`llm/structured.ts`).
- `review/` holds orchestration strategies: `run.ts` (single-pass),
  `reduce.ts` (map-reduce) — one file per strategy.
- See root [`AGENTS.md`](../AGENTS.md#naming-conventions) for cross-package
  rules.

## Gotchas

- `build` = typecheck only; there is no `dist/` to inspect for correctness.
- Contracts (`Review`, `Finding`, `Verdict`, …) come from `@devdigest/shared`
  (aliased to `server/src/vendor/shared`) — don't redefine them locally.

## Read when…

- **Editing anything under `src/` → the
  [`onion-architecture`](../.claude/skills/onion-architecture/SKILL.md) skill.**
  This package is the pure core of the onion; `npm run lint` enforces the
  import ban (no `fs`/`pg`/`drizzle-orm`/`octokit`/network outside `src/llm/`).
- Pipeline diagram and public API list → [`README.md`](README.md)
- Stage-by-stage pipeline, mode selection, LLMProvider port → [`docs/pipeline.md`](docs/pipeline.md)
- Grounding rule + deterministic scoring contract → [`specs/grounding-contract.md`](specs/grounding-contract.md)

## End of session

Wrapping up a substantive session? Run `/engineering-insights` (or let it
auto-trigger) to update `INSIGHTS.md` — don't skip this step.
