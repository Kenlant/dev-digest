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
    renderRow({ total_cost_usd: null });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the cumulative cost across the PR's runs", () => {
    renderRow({ total_cost_usd: 0.014 });
    expect(screen.getByText("$0.014")).toBeInTheDocument();
  });
});
