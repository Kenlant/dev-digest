/* SeverityCounterBar — lives inside one expanded ReviewRunAccordion, right
   under its VerdictBanner. Top row: read-only "N CRITICAL · N WARNING ·
   N SUGGESTION" pills for severities present in THIS run. Bottom row: three
   fixed filter buttons (Critical/Warning/Suggestion) that narrow this run's
   FindingsPanel to one severity — click the active one again to clear. */
"use client";

import React from "react";
import { SeverityBadge } from "@devdigest/ui";
import type { FindingRecord, Severity } from "@devdigest/shared";
import { s } from "./styles";

const SEVERITIES: Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"];
const SEV_LABEL: Record<Severity, string> = {
  CRITICAL: "Critical",
  WARNING: "Warning",
  SUGGESTION: "Suggestion",
};

export function SeverityCounterBar({
  findings,
  active,
  onSelect,
}: {
  findings: FindingRecord[];
  active: Severity | null;
  onSelect: (severity: Severity | null) => void;
}) {
  const counts = React.useMemo(() => {
    const c: Record<Severity, number> = { CRITICAL: 0, WARNING: 0, SUGGESTION: 0 };
    for (const f of findings) c[f.severity] = (c[f.severity] ?? 0) + 1;
    return c;
  }, [findings]);

  const present = SEVERITIES.filter((sev) => counts[sev] > 0);
  if (present.length === 0) return null;

  return (
    <div style={s.wrap}>
      <div style={s.countsRow} role="group" aria-label="Findings by severity">
        {present.map((sev, i) => (
          <React.Fragment key={sev}>
            {i > 0 && <span style={s.separator}>·</span>}
            <SeverityBadge severity={sev} count={counts[sev]} />
          </React.Fragment>
        ))}
      </div>
      <div style={s.filterRow} role="group" aria-label="Filter findings by severity">
        {SEVERITIES.map((sev) => {
          const isActive = active === sev;
          return (
            <button
              key={sev}
              type="button"
              onClick={() => onSelect(isActive ? null : sev)}
              aria-pressed={isActive}
              style={s.filterButton(isActive)}
            >
              {SEV_LABEL[sev]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
