/* FindingsCell — the PR list's Findings column. One compact SeverityBadge per
   severity present in the PR's latest review; hovering a badge opens a
   read-only popover ("N FINDINGS IN THIS RUN") previewing that severity's
   findings — no Accept/Dismiss chrome, this is list-page eyes-only. Accepting
   or dismissing a finding happens on the PR detail page's Review runs. */
"use client";

import React from "react";
import { SeverityBadge, CategoryTag, ConfidenceNum } from "@devdigest/ui";
import type { PrFindingPreview, Severity } from "@devdigest/shared";
import { s } from "./styles";

const SEVERITIES: Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"];

function FindingPreviewRow({ f }: { f: PrFindingPreview }) {
  return (
    <div style={s.previewRow}>
      <div style={s.previewHeader}>
        <SeverityBadge severity={f.severity} compact />
        <span style={s.previewTitle}>{f.title}</span>
      </div>
      <div style={s.previewMeta}>
        <CategoryTag category={f.category} />
        <span className="mono" style={s.previewFileLine}>
          {f.file}:{f.start_line}
          {f.end_line !== f.start_line ? `-${f.end_line}` : ""}
        </span>
        <ConfidenceNum value={f.confidence} />
      </div>
      <p style={s.previewDesc}>{f.rationale}</p>
    </div>
  );
}

function SeverityHoverBadge({ severity, findings }: { severity: Severity; findings: PrFindingPreview[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      style={s.trigger}
      aria-label={`${severity} findings`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <SeverityBadge severity={severity} count={findings.length} compact />
      {open && (
        <div style={s.popover}>
          <div style={s.popoverTitle}>
            {findings.length} FINDING{findings.length === 1 ? "" : "S"} IN THIS RUN
          </div>
          <div style={s.previewList}>
            {findings.map((f, i) => (
              <FindingPreviewRow key={i} f={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FindingsCell({ findings }: { findings: PrFindingPreview[] | undefined }) {
  const bySeverity = React.useMemo(() => {
    const m = new Map<Severity, PrFindingPreview[]>();
    for (const f of findings ?? []) {
      const list = m.get(f.severity) ?? [];
      list.push(f);
      m.set(f.severity, list);
    }
    return m;
  }, [findings]);

  const present = SEVERITIES.filter((sev) => (bySeverity.get(sev)?.length ?? 0) > 0);
  if (present.length === 0) return <span style={{ color: "var(--text-muted)" }}>—</span>;

  return (
    <div style={s.cell}>
      {present.map((sev) => (
        <SeverityHoverBadge key={sev} severity={sev} findings={bySeverity.get(sev)!} />
      ))}
    </div>
  );
}
