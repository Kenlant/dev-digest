# e2e specs

Two different things live here:

- `NN-name.flow.json` — the actual behavioral specs: one JSON flow per user
  journey, run in filename order by `../run.ts` (see `../AGENTS.md`'s
  naming convention).
- [`flow-contract.md`](flow-contract.md) — the contract those `.flow.json`
  files must follow (shape, execution rules), not a flow itself.
