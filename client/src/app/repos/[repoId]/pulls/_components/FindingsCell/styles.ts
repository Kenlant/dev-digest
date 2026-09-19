import type { CSSProperties } from "react";

/** Co-located styles for FindingsCell (the PR list's Findings column). */
export const s = {
  cell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  } satisfies CSSProperties,
  trigger: {
    position: "relative",
    display: "inline-flex",
  } satisfies CSSProperties,
  popover: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    width: 340,
    maxHeight: 320,
    overflowY: "auto",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-strong)",
    borderRadius: 9,
    boxShadow: "var(--shadow-modal)",
    padding: 10,
    zIndex: 50,
    animation: "ddpop .12s ease",
    cursor: "default",
  } satisfies CSSProperties,
  popoverTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    padding: "2px 4px 8px",
  } satisfies CSSProperties,
  previewList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  } satisfies CSSProperties,
  previewRow: {
    border: "1px solid var(--border)",
    borderRadius: 7,
    padding: "8px 9px",
    background: "var(--bg-surface)",
  } satisfies CSSProperties,
  previewHeader: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginBottom: 5,
  } satisfies CSSProperties,
  previewTitle: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "var(--text-primary)",
  } satisfies CSSProperties,
  previewMeta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 5,
  } satisfies CSSProperties,
  previewFileLine: {
    fontSize: 11.5,
    color: "var(--text-muted)",
  } satisfies CSSProperties,
  previewDesc: {
    fontSize: 12,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  } satisfies CSSProperties,
} as const;
