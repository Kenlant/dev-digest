/* Segment layout that exists ONLY to own this route's <title>.
   page.tsx here is a Client Component ("use client"), and a client module may
   not export `metadata`/`generateMetadata`. A segment layout can — layouts are
   Server Components by default — so the title comes from the route params
   without splitting the page into a server wrapper + client view. */
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  // Async params: Next 15 made params a Promise (next-best-practices/async-patterns).
  const { number } = await params;
  // Deliberately derived from params only — no fetch. The PR title lives behind
  // an API keyed by the row's uuid, not by number, so fetching it here would
  // mean resolving number -> uuid a second time (the waterfall documented in
  // the improvement plan). Not worth a request for a tab label.
  return { title: `PR #${number}` };
}

export default function PrDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
