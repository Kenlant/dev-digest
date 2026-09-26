import type { Metadata } from "next";
import { SettingsView } from "./_components/SettingsView";

/* Route: /settings/:section. Thin route entry — the view, its section panels,
   styles, constants and i18n are colocated under _components/SettingsView. */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  // Async params (Next 15). The section slug is already human-readable
  // ("api-keys", "models"), so it doubles as the title without a lookup.
  const { section } = await params;
  const label = section.replace(/-/g, " ");
  return { title: `Settings — ${label}` };
}

export default function SettingsPage() {
  return <SettingsView />;
}
