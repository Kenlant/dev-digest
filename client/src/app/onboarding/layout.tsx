/* Owns the <title> for onboarding (the page itself is a Client Component). */
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add a repository" };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
