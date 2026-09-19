import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { formatCost, RunCostBadge, RunCostMeta } from "./RunCostBadge";

afterEach(cleanup);

describe("formatCost", () => {
  it("shows adaptive precision matching the product mockups", () => {
    expect(formatCost(0.014)).toBe("$0.014");
    expect(formatCost(0.0013)).toBe("$0.0013");
    expect(formatCost(0.06)).toBe("$0.06");
  });

  it("never shows a fake $0.00 for an unknown cost", () => {
    expect(formatCost(null)).toBe("—");
  });

  it("shows $0.00 for a genuinely free/cached run (exact zero)", () => {
    expect(formatCost(0)).toBe("$0.00");
  });

  it("doesn't collapse a real near-zero cost to $0.00", () => {
    expect(formatCost(0.00004)).not.toBe("$0.00");
  });
});

describe("RunCostBadge", () => {
  it("renders — for a PR/run with no cost-tracked data", () => {
    render(<RunCostBadge costUsd={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the formatted cost", () => {
    render(<RunCostBadge costUsd={0.014} />);
    expect(screen.getByText("$0.014")).toBeInTheDocument();
  });
});

describe("RunCostMeta", () => {
  it("renders space-grouped total tokens + cost on one line", () => {
    render(<RunCostMeta tokensIn={8119} tokensOut={1000} costUsd={0.0013} />);
    expect(screen.getByText("9 119 tok · $0.0013")).toBeInTheDocument();
  });

  it("renders nothing when there's no data at all (e.g. a running/failed run)", () => {
    const { container } = render(<RunCostMeta tokensIn={null} tokensOut={null} costUsd={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
