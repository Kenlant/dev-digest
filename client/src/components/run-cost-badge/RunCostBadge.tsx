/* Shared cost display for review-run $ figures — the PR-list Cost column and
   the RunHistory per-run meta line both need the same formatting/no-fake-zero
   rules, so the logic lives in one place instead of three. */

/**
 * Formats a run's USD cost with adaptive precision (~2 significant digits:
 * $0.014, $0.0013, $0.06, $1.23) so a small run's cost doesn't round away to
 * nothing. `null` (unknown — pre-feature row, or cost couldn't be determined)
 * renders as "—", never a fake "$0.00". An exact `0` (a genuinely free/cached
 * run) DOES render as "$0.00" — that's real information, not a placeholder.
 */
export function formatCost(usd: number | null): string {
  if (usd == null) return "—";
  if (usd === 0) return "$0.00";
  const abs = Math.abs(usd);
  // Dollar-and-up: ordinary 2-decimal currency formatting ($1.23).
  if (abs >= 1) return `$${usd.toFixed(2)}`;
  // Sub-dollar (the common case for a single review run): keep exactly 2
  // significant figures so a small cost never rounds away to nothing —
  // toPrecision(2) would print a trailing zero ("0.060"), so round-trip
  // through Number()/String() to drop it back to "0.06".
  return `$${String(Number(abs.toPrecision(2)))}`;
}

/** Compact inline "$0.014"-style figure — the PR-list Cost cell. */
export function RunCostBadge({ costUsd }: { costUsd: number | null }) {
  return <span className="mono tnum">{formatCost(costUsd)}</span>;
}

/**
 * Single run's token count + cost on one line, e.g. "9 119 tok · $0.0013"
 * (RunHistory's per-run meta line). `tokensIn`/`tokensOut` are summed and
 * space-grouped — NOT the "12k→1.5k" style used in RunTraceDrawer, which is a
 * different display for a different place.
 */
export function RunCostMeta({
  tokensIn,
  tokensOut,
  costUsd,
}: {
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: number | null;
}) {
  if (tokensIn == null && tokensOut == null && costUsd == null) return null;
  const totalTokens = (tokensIn ?? 0) + (tokensOut ?? 0);
  return (
    <span>
      {groupThousands(totalTokens)} tok · {formatCost(costUsd)}
    </span>
  );
}

/** "9119" -> "9 119" — space-grouped thousands, matching the mockup's style. */
function groupThousands(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
