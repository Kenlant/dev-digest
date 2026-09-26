#!/usr/bin/env bash
# Build the three DevDigest commit-style eval fixtures.
#
#   build_fixtures.sh <dest-dir>
#
# Seeded history deliberately mirrors the REAL dev-digest repo: Conventional
# Commits subjects, problem-first bodies, and a Co-Authored-By trailer. It must
# NOT contain a Fortune: footer — that convention is introduced by the skill,
# so seeding it would teach the control group the one rule under test.
set -euo pipefail
DEST="${1:?usage: build_fixtures.sh <dest-dir>}"
rm -rf "$DEST"; mkdir -p "$DEST"

seed () {
  R="$1"; mkdir -p "$R"
  git -C "$R" init -q -b main
  git -C "$R" config user.email dev@devdigest.local
  git -C "$R" config user.name "DevDigest Dev"
  mkdir -p "$R/server/src/modules/reviews" "$R/client/src/app/repos" "$R/reviewer-core/src"
  echo "# DevDigest" > "$R/README.md"
  echo "export const VERSION = '0.1.0';" > "$R/server/src/index.ts"
  git -C "$R" add -A
  git -C "$R" commit -q -m "DevDigest — local AI PR-review lab (squashed snapshot)"
  echo "export type Verdict = 'approve' | 'request_changes';" > "$R/server/src/modules/reviews/types.ts"
  git -C "$R" add -A
  git -C "$R" commit -q -F - <<'MSG'
feat(reviews): expose the verdict contract shared by server and client

The review engine already produced an approve/request_changes verdict but kept
it internal to reviewer-core, so the client re-derived it from finding counts
and disagreed with the engine on runs that found only suggestions.

Lifts the type into modules/reviews/types.ts as the single declaration both
sides import. No behavior change yet — nothing reads it until the banner lands.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
MSG
}

# ---- f1: feature + incidental bug ----
F1="$DEST/f1-feature-plus-bug"; seed "$F1"
cat > "$F1/server/src/modules/reviews/run.repo.ts" <<'EOF'
import { db } from '../../db/client';
export async function listRuns(prId: string) {
  return db.query.agentRuns.findMany({ where: (r, { eq }) => eq(r.prId, prId) });
}
EOF
cat > "$F1/client/src/app/repos/RunHistory.tsx" <<'EOF'
export function RunHistory({ runs }: { runs: Run[] }) {
  return <ul>{runs.map((r) => <li key={r.id}>{r.model}</li>)}</ul>;
}
EOF
cat > "$F1/client/src/app/repos/usePolling.ts" <<'EOF'
import { useEffect } from 'react';
export function usePolling(fn: () => void, ms: number) {
  useEffect(() => {
    const id = setInterval(fn, ms);
  }, [fn, ms]);
}
EOF
git -C "$F1" add -A
git -C "$F1" commit -q -F - <<'MSG'
feat(reviews): run history list + polling hook

Adds the per-PR run list the detail page needs, plus a usePolling hook so the
list refreshes while a run is in flight without a manual reload.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
MSG
cat > "$F1/server/src/modules/reviews/run.repo.ts" <<'EOF'
import { db } from '../../db/client';
const STALE_AFTER_MS = 15 * 60 * 1000;
export async function listRuns(prId: string) {
  const rows = await db.query.agentRuns.findMany({ where: (r, { eq }) => eq(r.prId, prId) });
  return rows.map((r) => ({ ...r, stale: Date.now() - r.startedAt.getTime() > STALE_AFTER_MS && r.status === 'running' }));
}
EOF
cat > "$F1/client/src/app/repos/RunHistory.tsx" <<'EOF'
export function RunHistory({ runs }: { runs: Run[] }) {
  return (
    <ul>
      {runs.map((r) => (
        <li key={r.id}>
          {r.model}
          {r.stale && <span className="badge-stale" title="No heartbeat for 15m">STALE</span>}
        </li>
      ))}
    </ul>
  );
}
EOF
cat > "$F1/client/src/app/repos/usePolling.ts" <<'EOF'
import { useEffect } from 'react';
export function usePolling(fn: () => void, ms: number) {
  useEffect(() => {
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  }, [fn, ms]);
}
EOF
git -C "$F1" add -A

# ---- f2: tiny one-line fix ----
F2="$DEST/f2-tiny-fix"; seed "$F2"
cat > "$F2/reviewer-core/src/pricing.ts" <<'EOF'
export function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  return `$${usd.toFixed(2)}`;
}
EOF
mkdir -p "$F2/client/src/app/repos"
cat > "$F2/client/src/app/repos/RunCostBadge.tsx" <<'EOF'
import { formatCost } from '../../../../reviewer-core/src/pricing';
export function RunCostBadge({ costUsd }: { costUsd: number | null }) {
  return <span className="badge-cost">{formatCost(costUsd as number)}</span>;
}
EOF
git -C "$F2" add -A
git -C "$F2" commit -q -F - <<'MSG'
feat(reviewer): price book + cost formatter

Per-run USD cost is now computed from OpenRouter's reported spend, with a
PriceBook estimate as the fallback for providers that do not report one.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
MSG
cat > "$F2/reviewer-core/src/pricing.ts" <<'EOF'
export function formatCost(usd: number | null): string {
  if (usd === null) return '—';
  if (usd === 0) return '$0.00';
  return `$${usd.toFixed(2)}`;
}
EOF
git -C "$F2" add -A

# ---- f3: two unrelated CI-adjacent changes ----
F3="$DEST/f3-multipart-ci"; seed "$F3"
mkdir -p "$F3/.github/workflows" "$F3/server/src/modules/skills"
cat > "$F3/.github/workflows/server-unit.yml" <<'EOF'
name: server-unit
on: [push]
jobs:
  unit:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - run: pnpm test
EOF
cat > "$F3/server/package.json" <<'EOF'
{
  "name": "@devdigest/api",
  "dependencies": {
    "fastify": "^5.0.0",
    "drizzle-orm": "^0.36.0"
  }
}
EOF
cat > "$F3/server/src/modules/skills/service.ts" <<'EOF'
import { unzipSync } from 'fflate';
export function readSkillBundle(buf: Uint8Array) {
  return unzipSync(buf);
}
EOF
git -C "$F3" add -A
git -C "$F3" commit -q -F - <<'MSG'
ci(server): add unit lane on linux + windows

Runs the server suite on both platforms so path handling regressions surface
before release rather than on a contributor's machine.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
MSG
cat > "$F3/.github/workflows/server-unit.yml" <<'EOF'
name: server-unit
on: [push]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test
EOF
cat > "$F3/server/package.json" <<'EOF'
{
  "name": "@devdigest/api",
  "dependencies": {
    "fastify": "^5.0.0",
    "drizzle-orm": "^0.36.0",
    "fflate": "^0.8.2"
  }
}
EOF
git -C "$F3" add -A

for d in "$DEST"/*/; do
  printf '%-28s base_commits=%s staged=%s\n' "$(basename "$d")" \
    "$(git -C "$d" rev-list --count HEAD)" \
    "$(git -C "$d" diff --staged --name-only | wc -l | tr -d ' ')"
done
