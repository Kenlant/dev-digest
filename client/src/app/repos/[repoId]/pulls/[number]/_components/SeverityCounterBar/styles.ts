import type { CSSProperties } from "react";

/** Co-located styles for SeverityCounterBar. */
export const s = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 16,
  } satisfies CSSProperties,
  countsRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  } satisfies CSSProperties,
  separator: {
    color: "var(--text-muted)",
    fontSize: 13,
  } satisfies CSSProperties,
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  } satisfies CSSProperties,
  filterButton: (active: boolean): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 12px",
    borderRadius: 6,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
    background: active ? "var(--accent-bg)" : "transparent",
    color: active ? "var(--accent-text)" : "var(--text-secondary)",
    transition: "background .12s ease, border-color .12s ease, color .12s ease",
  }),
} as const;
