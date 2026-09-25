/**
 * RunHistory — the badge must reflect the review OUTCOME, not the run lifecycle.
 * Regression guard for the "green ✓ done on a run that found 5 blockers" bug:
 * a settled run is colored/labelled by its denormalized blocker/finding counts,
 * and shows the review score ring.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { RunSummary } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";
import { RunHistory } from "./RunHistory";

afterEach(cleanup);

function run(o: Partial<RunSummary>): RunSummary {
  return {
    run_id: "run-1",
    agent_id: "a1",
    agent_name: "Security Reviewer",
    provider: "openrouter",
    model: "deepseek/deepseek-v4-flash",
    status: "done",
    error: null,
    duration_ms: 1000,
    tokens_in: 100,
    tokens_out: 50,
    findings_count: 0,
    grounding: "0/0 passed",
    ran_at: "2026-06-11T18:44:34.000Z",
    score: null,
    blockers: null,
    cost_usd: null,
    ...o,
  };
}

function renderRuns(runs: RunSummary[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <RunHistory runs={runs} onOpenTrace={() => {}} />
    </NextIntlClientProvider>,
  );
}

describe("RunHistory — outcome badge", () => {
  it("a done run WITH blockers reads 'rejected' (never green 'done') + shows the score ring", () => {
    renderRuns([run({ status: "done", findings_count: 5, blockers: 5, score: 0 })]);
    expect(screen.getByText("rejected")).toBeInTheDocument();
    expect(screen.queryByText("done")).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument(); // CircularScore renders the number
    expect(screen.getByText(/5 blockers/)).toBeInTheDocument();
  });

  it("a clean done run reads 'approved'", () => {
    renderRuns([run({ status: "done", findings_count: 0, blockers: 0, score: 95 })]);
    expect(screen.getByText("approved")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument();
  });

  it("a done run with non-blocking findings reads 'reviewed'", () => {
    renderRuns([run({ status: "done", findings_count: 3, blockers: 0, score: 72 })]);
    expect(screen.getByText("reviewed")).toBeInTheDocument();
    expect(screen.queryByText(/blockers/)).not.toBeInTheDocument();
  });

  it("a failed run reads 'error'", () => {
    renderRuns([run({ status: "failed", error: "boom", score: null, blockers: null })]);
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("a running run reads 'running'", () => {
    renderRuns([run({ status: "running", score: null, blockers: null })]);
    expect(screen.getByText("running")).toBeInTheDocument();
  });
});

describe("RunHistory — findings badges (hover preview, matches the PR list's FindingsCell)", () => {
  it("shows a severity badge for a run with findings, and none for a run without", () => {
    const { container } = renderRuns([
      run({
        run_id: "run-with-findings",
        status: "done",
        findings: [
          {
            severity: "CRITICAL",
            category: "security",
            title: "Hardcoded secret",
            file: "src/config.ts",
            start_line: 11,
            end_line: 11,
            confidence: 0.9,
            rationale: "r",
          },
        ],
      }),
    ]);
    expect(container.querySelector('[aria-label="CRITICAL findings"]')).toBeInTheDocument();
  });

  it("renders nothing extra for a run with no findings (no stray dash on the tile)", () => {
    const { container } = renderRuns([run({ status: "running", findings: undefined })]);
    expect(container.querySelector('[aria-label$="findings"]')).not.toBeInTheDocument();
  });
});

describe("RunHistory — cost/tokens line", () => {
  it("shows tokens + cost for a settled run that has them", () => {
    renderRuns([run({ status: "done", tokens_in: 8119, tokens_out: 1000, cost_usd: 0.0013 })]);
    expect(screen.getByText("9 119 tok · $0.0013")).toBeInTheDocument();
  });

  it("shows no cost line (not a fake $0.00) for a legacy run with no cost data", () => {
    renderRuns([run({ status: "done", tokens_in: null, tokens_out: null, cost_usd: null })]);
    expect(screen.queryByText(/\$0\.00/)).not.toBeInTheDocument();
  });
});
