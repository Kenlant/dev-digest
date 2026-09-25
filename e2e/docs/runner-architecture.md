# e2e runner architecture

How `run.ts` turns a `specs/*.flow.json` file into a pass/fail result
against the real, running stack.

## Why agent-browser, not Playwright

`agent-browser` (Vercel) is a CDP browser-automation **CLI**, not a test
framework — it has no assertion library, no test runner, no fixtures. It
exposes commands like `open`, `wait --text`, `wait --url`, `wait --load`,
`click`, `type`, `screenshot`, `close` as separate process invocations
against one shared, kept-alive browser session (the daemon keeps the page
open between invocations, so state — like being logged into a page —
persists step to step within a flow).

This package is the thin convention layered on top: each user journey is
declared as data (`specs/NN-name.flow.json`), and `run.ts` is the only
code that knows how to execute one.

## Execution model (`run.ts`)

```
main()
  loadFlows()          read + parse every specs/*.flow.json, sorted by filename
  for each flow:
    runFlow(file, flow)
      for each step:
        resolveArgs(step.cmd, BASE)   substitute "{BASE}" → E2E_BASE_URL
        ab(args)                      execFile(AGENT_BROWSER_BIN, args)
        if step.assert?.stdoutIncludes: extra substring check on stdout
        on failure: screenshot to test-results/<flow-id>-fail.png, stop this flow
  ab(["close"])          tear down the shared browser session (always, via finally)
  exit 0 if every flow's every step passed, else 1
```

A command's own exit code IS the primary assertion: `wait --text "X"` and
`wait --url "/pulls"` block until the condition holds or the runner's
per-step timeout (`E2E_STEP_TIMEOUT`, default 60000ms) elapses, then exit
non-zero. `step.assert.stdoutIncludes` is the only assertion this repo
adds on top, for the rare case where a command's own exit code isn't
enough (see `lib/assert.ts`).

Flows run in **filename order** (`01-`, `02-`, …), sequentially, sharing
one browser session across the whole run — a later flow can rely on
state a lower-numbered flow already established (e.g. seeded data being
visible). A flow is not required to be independent of the ones before it;
check `run.ts`'s sort before assuming otherwise.

## What this suite does NOT do

- No LLM calls — every flow targets read-only seeded data. Findings,
  scores, and reviews used by these flows are pre-seeded, not generated
  live by a review run.
- No mocking — this is the **only** suite in the repo that needs the full
  live stack (Postgres + API + web all running, via `../scripts/dev.sh` or
  `npm run e2e:hermetic`). Everything else in the repo (client component
  tests, server unit tests) mocks or stubs those.
- No hover assertions — `agent-browser`'s vocabulary is click/text/url
  based only; hover-triggered UI (e.g. the PR list's Findings-column
  popover) is covered by the relevant client component test instead
  (`mouseenter`/`mouseleave` simulated directly), not forced into a flow
  spec. See `INSIGHTS.md`.

See [`../specs/flow-contract.md`](../specs/flow-contract.md) for the exact
JSON shape a `*.flow.json` file must follow.
