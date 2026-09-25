import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrMeta } from "@/lib/types";
import messages from "../../../../../../../messages/en/prReview.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { PRRow } from "./PRRow";

afterEach(cleanup);

const PR: PrMeta = {
  id: "pr1",
  number: 482,
  title: "Add rate limiting to public API endpoints",
  author: "marisa.koch",
  branch: "feat/rate-limit-public",
  base: "main",
  head_sha: "abc123",
  additions: 200,
  deletions: 40,
  files_count: 5,
  status: "needs_review",
  opened_at: null,
  updated_at: "2026-06-11T18:44:34.000Z",
  score: 61,
};

function renderRow(pr: Partial<PrMeta>) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <PRRow pr={{ ...PR, ...pr }} repoId="repo1" />
    </NextIntlClientProvider>,
  );
}

describe("PRRow — cost cell", () => {
  it("shows — (not a fake $0.00) for a PR with no cost-tracked runs", () => {
    const { container } = renderRow({ total_cost_usd: null });
    // Scoped to the cost badge's own markup — the Findings cell also renders
    // a bare "—" dash (no findings yet), so a plain getByText("—") is ambiguous.
    expect(container.querySelector(".mono.tnum")).toHaveTextContent("—");
  });

  it("shows the cumulative cost across the PR's runs", () => {
    renderRow({ total_cost_usd: 0.014 });
    expect(screen.getByText("$0.014")).toBeInTheDocument();
  });
});

describe("PRRow — findings cell", () => {
  it("shows — for a PR with no findings yet", () => {
    renderRow({ findings: [] });
    // The Cost cell also renders a bare "—" dash when untracked — it's the
    // one with the RunCostBadge's "mono" class; the Findings dash isn't.
    const dashes = screen.getAllByText("—");
    expect(dashes.some((el) => !el.className.includes("mono"))).toBe(true);
  });

  it("shows a compact severity badge for each present severity", () => {
    const { container } = renderRow({
      findings: [
        {
          severity: "CRITICAL",
          category: "security",
          title: "Hardcoded secret",
          file: "src/config.ts",
          start_line: 1,
          end_line: 1,
          confidence: 0.9,
          rationale: "r",
        },
      ],
    });
    expect(container.querySelector('[aria-label="CRITICAL findings"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="WARNING findings"]')).not.toBeInTheDocument();
  });
});
