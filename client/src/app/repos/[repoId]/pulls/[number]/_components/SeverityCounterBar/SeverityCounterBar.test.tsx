import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import type { FindingRecord } from "@devdigest/shared";
import { SeverityCounterBar } from "./SeverityCounterBar";

afterEach(cleanup);

function finding(overrides: Partial<FindingRecord>): FindingRecord {
  return {
    id: "f1",
    severity: "CRITICAL",
    category: "security",
    title: "t",
    file: "src/a.ts",
    start_line: 1,
    end_line: 1,
    rationale: "r",
    suggestion: null,
    confidence: 0.9,
    kind: "finding",
    trifecta_components: null,
    evidence: null,
    review_id: "r1",
    accepted_at: null,
    dismissed_at: null,
    ...overrides,
  };
}

const FINDINGS: FindingRecord[] = [
  finding({ id: "f1", severity: "CRITICAL" }),
  finding({ id: "f2", severity: "CRITICAL" }),
  finding({ id: "f3", severity: "WARNING" }),
];

describe("SeverityCounterBar", () => {
  it("renders a counter pill per present severity, omitting absent ones", () => {
    render(<SeverityCounterBar findings={FINDINGS} active={null} onSelect={vi.fn()} />);
    const counts = within(screen.getByRole("group", { name: "Findings by severity" }));
    expect(counts.getByText("Critical")).toBeInTheDocument();
    expect(counts.getByText("2")).toBeInTheDocument();
    expect(counts.getByText("Warning")).toBeInTheDocument();
    expect(counts.getByText("1")).toBeInTheDocument();
    expect(counts.queryByText("Suggestion")).not.toBeInTheDocument();
  });

  it("always renders all three filter buttons, even for a severity with zero findings", () => {
    render(<SeverityCounterBar findings={FINDINGS} active={null} onSelect={vi.fn()} />);
    const filters = within(screen.getByRole("group", { name: "Filter findings by severity" }));
    expect(filters.getByRole("button", { name: "Critical" })).toBeInTheDocument();
    expect(filters.getByRole("button", { name: "Warning" })).toBeInTheDocument();
    expect(filters.getByRole("button", { name: "Suggestion" })).toBeInTheDocument();
  });

  it("renders nothing when the run has no findings at all", () => {
    const { container } = render(
      <SeverityCounterBar findings={[]} active={null} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("selects a severity on click", () => {
    const onSelect = vi.fn();
    render(<SeverityCounterBar findings={FINDINGS} active={null} onSelect={onSelect} />);
    screen.getByRole("button", { name: "Critical" }).click();
    expect(onSelect).toHaveBeenCalledWith("CRITICAL");
  });

  it("clears the active severity when its filter button is clicked again", () => {
    const onSelect = vi.fn();
    render(<SeverityCounterBar findings={FINDINGS} active="CRITICAL" onSelect={onSelect} />);
    const btn = screen.getByRole("button", { name: "Critical" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    btn.click();
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
