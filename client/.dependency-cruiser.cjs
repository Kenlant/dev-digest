/**
 * Frontend boundary gate for @devdigest/web.
 *
 * Enforces the layering described in
 * `.claude/skills/frontend-architecture/SKILL.md` — R2 ("imports flow one way:
 * shared -> features -> app"), R7 (only the design system touches primitives)
 * and R13 (a barrel belongs at a package boundary, so cycles are a real risk
 * inside app code).
 *
 * Run:
 *   pnpm lint:arch
 *
 * WHY dependency-cruiser and not `import/no-restricted-paths`: the skill's
 * Tier 1 config needs eslint-plugin-import, which has no ESLint 10 flat-config
 * story yet. Tier 3 is this file, expresses the cross-feature ban ONCE with a
 * capture group instead of O(n) hand-maintained zones, and is the tool
 * `server/` already uses — one dialect for the whole repo.
 *
 * NOTE: `src/features/` does not exist yet (see the skill's dev-digest.md
 * gap #1). These rules are deliberately installed BEFORE it does: rules are
 * cheap before the code exists and expensive after. The features-layer rules
 * therefore match zero files today — that is the point, not an oversight.
 *
 * CommonJS on purpose: this package is "type": "module", so a `.cjs` config
 * needs no build step.
 */
module.exports = {
  forbidden: [
    // ------------------------------------------------- R2: one-way layering
    {
      name: 'shared-knows-no-features',
      comment:
        'The shared layer (components/, hooks/, lib/, types/) is the bottom of ' +
        'the stack: app/ and features/ import IT, never the reverse. A shared ' +
        'module reaching into a route segment or a feature is the coupling that ' +
        'makes a "shared" folder unmovable.',
      severity: 'error',
      from: { path: '^src/(components|hooks|lib|types)/' },
      to: { path: '^src/(app|features)/' },
    },
    {
      name: 'features-know-no-routes',
      comment:
        'features/ is domain code; app/ is routing. A feature importing from a ' +
        'route segment inverts that and makes the feature un-reusable by a ' +
        'second route — the exact promotion path R1 depends on.',
      severity: 'error',
      from: { path: '^src/features/' },
      to: { path: '^src/app/' },
    },
    {
      name: 'no-cross-feature-imports',
      comment:
        'No feature imports another feature — compose them at the app level. ' +
        'This is the ban that FORCES promotion (R1): the only legal way for ' +
        'feature B to use feature A\'s component is to move it up to ' +
        'components/. Waiving this rule is the documented trigger for adopting ' +
        "FSD's entities layer, so it should fail loudly, not silently.",
      severity: 'error',
      from: { path: '^src/features/([^/]+)/.+' },
      to: { path: '^src/features/([^/]+)/.+', pathNot: '^src/features/$1/.+' },
    },

    // --------------------------------- R7: design system owns the primitives
    {
      name: 'ui-package-barrel-only',
      comment:
        'vendor/ui (@devdigest/ui) is a real package boundary: import { X } ' +
        'from "@devdigest/ui", never from its internal layers. This rule is ' +
        'documented in client/AGENTS.md and was, until now, enforced by ' +
        'NOTHING — a path alias permits every illegal import equally.',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/vendor/ui/' },
      to: {
        path: '^src/vendor/ui/(kit|charts|primitives|shell|command-palette)/',
      },
    },
    {
      name: 'ui-package-is-self-contained',
      comment:
        'The design system may not depend on app code, feature code or the ' +
        'app-level data layer — that is what would turn a reusable kit into a ' +
        'DevDigest-only kit. Shared contracts (vendor/shared) stay allowed: ' +
        'FSD permits shared UI to be "business-themed", just not business-aware.',
      severity: 'error',
      from: { path: '^src/vendor/ui/' },
      to: { path: '^src/(app|features|lib|components|hooks)/' },
    },

    // ------------------------------------------------------------- hygiene
    {
      name: 'no-circular',
      comment:
        'A dependency cycle means two modules are really one. This is the ' +
        'concrete cost of the barrel index.ts files that R13 warns about ' +
        'inside app code — the architecture argument against them is circular ' +
        'imports, not bundle size.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: [
        '\\.test\\.tsx?$',
        '^src/test/',
        // Manual copy of the server's contracts — owned by server/, and guarded
        // against drift by scripts/check-shared-drift.sh instead.
        '^src/vendor/shared/',
      ].join('|'),
    },
    tsConfig: { fileName: 'tsconfig.json' }, // resolves the @/* and @devdigest/* aliases
    tsPreCompilationDeps: true, // see type-only imports too
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
