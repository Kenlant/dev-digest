import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { PrFindingPreview } from "@devdigest/shared";
import { FindingsCell } from "./FindingsCell";

afterEach(cleanup);

function preview(overrides: Partial<PrFindingPreview>): PrFindingPreview {
  return {
    severity: "CRITICAL",
    category: "security",
    title: "Hardcoded Stripe secret key",
    file: "src/config.ts",
    start_line: 11,
    end_line: 11,
    confidence: 0.95,
    rationale: "A secret is committed to the repo.",
    ...overrides,
  };
}

function trigger(container: HTMLElement, severity: string): HTMLElement {
  const el = container.querySelector(`[aria-label="${severity} findings"]`);
  if (!el) throw new Error(`no trigger for ${severity}`);
  return el as HTMLElement;
}

describe("FindingsCell", () => {
  it("renders a dash when there are no findings", () => {
    render(<FindingsCell findings={[]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders one badge per present severity, omitting absent ones", () => {
    const { container } = render(
      <FindingsCell
        findings={[preview({ severity: "CRITICAL" }), preview({ severity: "WARNING" })]}
      />,
    );
    expect(trigger(container, "CRITICAL")).toBeInTheDocument();
    expect(trigger(container, "WARNING")).toBeInTheDocument();
    expect(container.querySelector('[aria-label="SUGGESTION findings"]')).not.toBeInTheDocument();
  });

  it("shows a read-only preview popover on hover, titled with the count", () => {
    const { container } = render(
      <FindingsCell findings={[preview({ severity: "CRITICAL", title: "Hardcoded Stripe secret key" })]} />,
    );
    expect(screen.queryByText("Hardcoded Stripe secret key")).not.toBeInTheDocument();

    fireEvent.mouseEnter(trigger(container, "CRITICAL"));
    expect(screen.getByText("1 FINDING IN THIS RUN")).toBeInTheDocument();
    expect(screen.getByText("Hardcoded Stripe secret key")).toBeInTheDocument();
    expect(screen.getByText("src/config.ts:11")).toBeInTheDocument();
    expect(screen.getByText("95% conf")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hides the popover again on mouse leave", () => {
    const { container } = render(<FindingsCell findings={[preview({ severity: "CRITICAL" })]} />);
    const el = trigger(container, "CRITICAL");
    fireEvent.mouseEnter(el);
    expect(screen.getByText("1 FINDING IN THIS RUN")).toBeInTheDocument();
    fireEvent.mouseLeave(el);
    expect(screen.queryByText("1 FINDING IN THIS RUN")).not.toBeInTheDocument();
  });

  it("scopes the popover to just the hovered severity", () => {
    const { container } = render(
      <FindingsCell
        findings={[
          preview({ severity: "CRITICAL", title: "Critical issue" }),
          preview({ severity: "WARNING", title: "Warning issue" }),
        ]}
      />,
    );
    fireEvent.mouseEnter(trigger(container, "CRITICAL"));
    expect(screen.getByText("Critical issue")).toBeInTheDocument();
    expect(screen.queryByText("Warning issue")).not.toBeInTheDocument();
  });
});
