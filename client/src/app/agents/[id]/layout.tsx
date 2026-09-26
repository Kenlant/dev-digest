/* Owns the <title> for the agent editor (the page itself is a Client Component).
   The agent's name would need a fetch, so the static label is used instead. */
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Agent editor" };

export default function AgentEditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
