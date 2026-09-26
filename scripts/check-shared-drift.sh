#!/usr/bin/env bash
#
# Guard the ONE manual copy in this repo: client/src/vendor/shared is a
# hand-maintained duplicate of the canonical server/src/vendor/shared (see the
# root AGENTS.md "do-not-touch / drift risk" note). Nothing synced them, so they
# drifted — by the time this script was written, 5 of 11 files differed, and the
# client's copy was missing 'openrouter' from PluginAgent.provider and the whole
# AgentManifest schema.
#
#   ./scripts/check-shared-drift.sh          # fail (with a diff) if they differ
#   ./scripts/check-shared-drift.sh --fix    # copy canonical -> client
#
# Run from CI in both client.yml and server-unit.yml, because either side can
# be the one that moved.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CANONICAL="$ROOT/server/src/vendor/shared"
COPY="$ROOT/client/src/vendor/shared"

if [[ "${1:-}" == "--fix" ]]; then
  cp -R "$CANONICAL/." "$COPY/"
  echo "synced $COPY from canonical $CANONICAL"
  exit 0
fi

if diff -r "$CANONICAL" "$COPY" >/dev/null 2>&1; then
  echo "shared contracts in sync"
  exit 0
fi

echo "::error::client/src/vendor/shared has drifted from the canonical server/src/vendor/shared"
echo
diff -r "$CANONICAL" "$COPY" || true
echo
echo "Fix: ./scripts/check-shared-drift.sh --fix   (then re-run typecheck in BOTH packages)"
exit 1
