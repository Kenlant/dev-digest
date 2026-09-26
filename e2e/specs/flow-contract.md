# Spec — flow file contract

The JSON shape every `specs/NN-name.flow.json` must satisfy, as consumed by
`run.ts` and typed in `lib/assert.ts`. This file documents the contract
itself; the `.flow.json` files are the actual specs written against it
(per the naming convention in `../AGENTS.md`) — this file is not one of
them.

## Shape

```ts
interface Flow {
  name: string;           // human label, printed as "▶ <name>  (<file>)"
  description?: string;   // why this flow exists / what it proves (recommended)
  steps: Step[];
}

interface Step {
  cmd: string[];           // agent-browser argv; "{BASE}" substituted with E2E_BASE_URL
  label?: string;          // defaults to the joined cmd if omitted
  assert?: { stdoutIncludes?: string };  // extra check beyond the command's exit code
}
```

## Contract rules

1. **Filename**: `NN-name.flow.json`, zero-padded two-digit prefix,
   numbered by intended run order (`01-app-boot`, `02-repo-pulls-detail`,
   …). `run.ts` loads and runs files in filename-sorted order — the number
   is not decorative, it's the execution order.
2. **`{BASE}` placeholder**: any `cmd` entry containing `{BASE}` gets it
   replaced with `E2E_BASE_URL` (trailing slash stripped) at run time —
   never hardcode `http://localhost:3000` in a step.
3. **A step's own exit code is the primary assertion.** `wait --text "…"`
   and `wait --url "…"` block until true or `E2E_STEP_TIMEOUT` elapses,
   then fail with a non-zero exit — that alone fails the step. Only add
   `assert.stdoutIncludes` when the command's exit code can't distinguish
   "found the right thing" from "found something else that also matched".
4. **One failed step stops the flow.** `runFlow` breaks at the first
   failing step (capturing a screenshot first) rather than continuing —
   there is no "soft assertion" that lets a flow keep going after a miss.
5. **No LLM-dependent state.** A flow may only assert against read-only
   seeded data (repos/PRs/findings already in the DB before the flow
   runs) — nothing here triggers a review run or otherwise depends on a
   model call, so flows stay deterministic and keyless.
6. **No hover-only assertions.** `agent-browser`'s vocabulary has no
   confirmed hover primitive; a behavior that only shows up on `:hover`
   (e.g. a popover) is out of scope for a flow spec — cover it in the
   relevant client component test instead (see
   `client/.../FindingsCell/FindingsCell.test.tsx` for the pattern).

## Minimal valid example

```json
{
  "name": "App boots and lands on a repo's PR list",
  "description": "Whole-stack smoke: client loads, calls the API, redirects.",
  "steps": [
    { "cmd": ["open", "{BASE}/"], "label": "load the app root" },
    { "cmd": ["wait", "--load", "networkidle"] },
    { "cmd": ["wait", "--url", "/pulls"] },
    { "cmd": ["wait", "--text", "Pull Requests"] }
  ]
}
```
