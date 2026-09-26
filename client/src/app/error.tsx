/* Route-level error boundary for every segment under app/.
   Until this file existed, an uncaught render error anywhere in the tree fell
   through to Next's default error screen — the app's own ErrorState was only
   reachable from the explicit `isError` branches inside each page. */
"use client";

import { useEffect } from "react";
import { ErrorState } from "@devdigest/ui";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Errors caught by a boundary never reach the global QueryCache handler, so
  // they'd otherwise be invisible in the console of a production build.
  useEffect(() => {
    console.error("route error boundary caught:", error);
  }, [error]);

  return (
    <ErrorState
      fullScreen
      title="Something went wrong"
      body={error.message || "This page failed to render."}
      onRetry={reset}
    />
  );
}
