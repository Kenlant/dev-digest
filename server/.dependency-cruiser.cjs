/**
 * Onion Architecture gate for @devdigest/api.
 *
 * Enforces the ring directions described in
 * `.claude/skills/onion-architecture/SKILL.md` — arrows point inward only.
 *
 * Run:
 *   pnpm exec depcruise src --config .dependency-cruiser.cjs --ignore-known  # the CI gate
 *   pnpm exec depcruise src --config .dependency-cruiser.cjs                # full report
 *   pnpm exec depcruise-baseline src --config .dependency-cruiser.cjs       # re-snapshot
 *
 * `.dependency-cruiser-known-violations.json` is the committed snapshot of
 * accepted debt, so CI fails only on NEW violations. Never grow it; shrink it
 * whenever you touch a module. That file is also the proof these rules are not
 * vacuous — if it is ever empty while `pulls`/`settings`/`polling`/`workspace`
 * still query Drizzle from their handlers, the path patterns below are wrong.
 *
 * CAUTION — the snapshot stores RESOLVED file paths, so it is sensitive to the
 * node_modules layout. An entry for an external package reads
 * `node_modules/drizzle-orm/index.d.ts` under this repo's committed
 * `.npmrc` (`node-linker=hoisted`) but
 * `node_modules/.pnpm/drizzle-orm@<ver>_.../node_modules/drizzle-orm/index.d.ts`
 * under pnpm's default isolated layout. Baseline it from an install that honours
 * `.npmrc` — a baseline taken on the isolated layout leaves 4 `routes-no-drizzle`
 * violations unmatched and fails CI on a clean checkout. If `--ignore-known`
 * suddenly reports a handful of violations you did not write, check this before
 * assuming you broke something, and re-baseline rather than editing the file by
 * hand. The rules themselves match either layout.
 *
 * CommonJS on purpose: this package is "type": "module", so a `.cjs` config
 * needs no build step and no tsx.
 */
module.exports = {
  forbidden: [
    // ---------------------------------------------------------------- ring 1
    {
      name: 'domain-is-pure',
      comment:
        'domain/ is the innermost ring: entities, value objects and the ports ' +
        'they declare. It may not know about persistence, transport, validation ' +
        'or any adapter. NOTE: matches zero files until a module actually has a ' +
        'domain/ folder — a green run proves nothing for a module without one.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/domain/' },
      to: {
        path: [
          '^src/(db|adapters|platform|vendor)/',
          'node_modules/(drizzle-orm|fastify|zod|postgres|octokit|openai|@anthropic-ai|simple-git|@fastify)/',
        ].join('|'),
      },
    },

    // ---------------------------------------------------------------- ring 2
    {
      name: 'app-layer-no-persistence',
      comment:
        'service.ts / run-executor.ts are the application ring. They orchestrate ' +
        'domain entities over injected ports. A Drizzle import — or a $inferSelect ' +
        'row type via db/rows.js — means persistence has leaked inward.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/(service|run-executor|diff-loader)\\.ts$' },
      to: { path: '^src/db/(schema|rows)|node_modules/(drizzle-orm|postgres)/' },
    },

    // ---------------------------------------------------------------- ring 3
    {
      name: 'routes-no-drizzle',
      comment:
        'routes.ts is transport only: context in, DTO -> entity, service call, ' +
        'entity -> DTO out. Querying the database from a Fastify handler is the ' +
        'single most common violation in this codebase (pulls, polling, ' +
        'workspace, settings).',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to: { path: '^src/db/(schema|rows|client)|node_modules/(drizzle-orm|postgres)/' },
    },

    // ------------------------------------------------- ports vs. concretions
    {
      name: 'no-concrete-adapters-outside-container',
      comment:
        'platform/container.ts is the composition root — the only place a ' +
        'concrete adapter may be named. Feature code depends on ports, which ' +
        'live in vendor/shared/adapters.ts or in an adapter folder index.ts. ' +
        'Importing an adapter-internal module bypasses the DI seam and makes ' +
        'the caller untestable without the real client.',
      severity: 'error',
      from: {
        path: '^src/(modules|platform)/',
        pathNot: '^src/platform/container\\.ts$',
      },
      to: {
        path: '^src/adapters/',
        pathNot: '^src/adapters/([^/]+/index\\.ts|mocks\\.ts)$',
      },
    },

    // -------------------------------------------- composition root direction
    {
      name: 'db-layer-knows-nothing',
      comment:
        'db/ is the outermost persistence ring: schema, client, migrations. It ' +
        'must never reach back into a feature module, an adapter or platform glue.',
      severity: 'error',
      from: { path: '^src/db/' },
      to: { path: '^src/(modules|adapters|platform)/' },
    },

    // ------------------------------------------- reviewer-core encapsulation
    {
      name: 'reviewer-core-public-api-only',
      comment:
        'reviewer-core exposes exactly one public surface: its index.ts. ' +
        'Importing an internal pipeline file couples us to its file layout ' +
        '(reviewer-core/AGENTS.md).',
      severity: 'error',
      from: { path: '^src/' },
      to: {
        path: 'reviewer-core/src/',
        pathNot: 'reviewer-core/src/index\\.ts$',
      },
    },

    // --------------------------------------------------------------- hygiene
    {
      name: 'no-circular',
      comment:
        'A dependency cycle means two modules are really one, and it defeats any ' +
        'claim about ring direction.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      comment: 'Dead module — nothing imports it and it is not an entry point.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '^src/server\\.ts$',
          '^src/db/(migrate|seed)\\.ts$',
          '^src/adapters/mocks\\.ts$',
        ].join('|'),
      },
      to: {},
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: [
        '^clones/', // cloned user repos analysed by repo-intel — not our code
        '^dist/',
        '^src/db/migrations/',
        '^src/prompts/',
      ].join('|'),
    },
    tsConfig: { fileName: 'tsconfig.json' }, // resolves @devdigest/* path aliases
    tsPreCompilationDeps: true, // see type-only imports (the $inferSelect leaks)
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.ts', '.d.ts'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
