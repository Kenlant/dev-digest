/* Navigation fallback for any segment without its own loading.tsx.
   Every page here is a Client Component that renders its OWN <Skeleton> block
   while TanStack Query fetches, so this covers the earlier gap: the moment
   between clicking a link and that component mounting, which previously showed
   the old route frozen in place. */
import { Skeleton } from "@devdigest/ui";

export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        maxWidth: 1080,
        margin: "0 auto",
      }}
    >
      <Skeleton height={28} width={420} />
      <Skeleton height={16} width={300} />
      <Skeleton height={200} />
    </div>
  );
}
