# reviewer-core pipeline architecture

`reviewPullRequest()` (`review/run.ts`) is the one public entry point. It
takes a diff + resolved agent inputs + an injected `LLMProvider`, and
returns a grounded `Review`. No DB, GitHub, or filesystem access anywhere
in this package — the only side effect is the LLM call, and only through
the injected provider. That is what makes every unit test hermetic
(stub `LLMProvider`, no keys/network) and what lets the exact same engine
run inside the server (studio, local reviews) and the CI runner (no
server, no DB) with identical behavior.

## Stages

```
assemblePrompt()        prompt.ts    — system + skills/memory/specs/callers/
                                        repoMap/prDescription/task + diff,
                                        wrapped against prompt injection
        │
        ▼
selectMode()             run.ts      — 'single-pass' vs 'map-reduce'
        │
        ▼
llm.completeStructured() (injected)  — one call per chunk; Zod schema
                                        (`Review`) enforced via structured.ts
        │
        ▼
reduceReviews()           review/reduce.ts — merge per-chunk partials into
                                              one Review (map-reduce only;
                                              single-pass has one partial)
        │
        ▼
groundFindings()          grounding.ts — SHARED citation gate, both modes
        │
        ▼
scoreFromFindings()        review/reduce.ts — score recomputed from
                                               SURVIVING findings only
```

## Mode selection (`selectMode`, `run.ts`)

- `strategy: 'single-pass'` → always one call over the whole diff.
- `strategy: 'map-reduce'` → one call per changed file, whenever there's
  more than one file (a single-file diff never needs reducing).
- `strategy: 'auto'` (default) → map-reduce only when the diff is **both**
  larger than `DEFAULT_MAP_THRESHOLD_LINES` (400, additions+deletions
  summed) **and** touches more than one file; otherwise single-pass.

Each chunk becomes its own `llm.completeStructured()` call with its own
`PromptAssembly`; in single-pass mode that assembly (not the whole-diff
one built up-front) is what ends up in the run trace.

## The injected `LLMProvider` port

`ReviewInput.llm` is the only side-effecting dependency. The package ships
one concrete implementation, `OpenRouterProvider` (`llm/openrouter.ts`),
used by both the CI runner and the server's OpenRouter path; the server
also has its own OpenAI/Anthropic adapters (`server/src/adapters/llm/`)
that satisfy the same port. `structured.ts` handles the Zod→JSON-Schema
conversion and `parseWithRepair` — a malformed structured response gets a
bounded number of reprompt retries (`ReviewInput.maxRetries`, default
`DEFAULT_REVIEW_MAX_RETRIES = 2`) before the call fails outright.

## Citation grounding — the mandatory gate

See [`../specs/grounding-contract.md`](../specs/grounding-contract.md) for
the exact rule. It runs once, after `reduceReviews()`, regardless of which
mode produced the merged review — grounding is never duplicated per
strategy and never skipped.

## Output shaping (`output/to-review.ts`)

`toReviewPayload()` turns a grounded `Review` into the shape the CI runner
posts back to GitHub (review body + inline comments + approve/request-
changes event); `countBlockers()` and `gateTriggered()` derive the
deterministic pass/fail signal from a severity threshold
(`agent.ciFailOn` in the server, a CLI flag in the runner) — never from
the model's own self-reported verdict string.
