/* Owns the <title> for the PR list. See the sibling [number]/layout.tsx for why
   the title lives in a layout rather than in the (client) page. */
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pull requests" };

export default function PullsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
