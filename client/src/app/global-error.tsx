/* Last-resort boundary: catches errors thrown by the ROOT layout itself, which
   error.tsx cannot — it lives inside that layout. It therefore has to render its
   own <html>/<body>, and it cannot rely on globals.css, the theme script, the
   providers or @devdigest/ui being mounted. Kept deliberately dependency-free
   and inline-styled for that reason. */
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0d10",
          color: "#e6e8eb",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div role="alert" style={{ textAlign: "center", padding: 24, maxWidth: 520 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>DevDigest failed to start</h1>
          <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 20 }}>
            {error.message || "The application shell could not be rendered."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              borderRadius: 6,
              border: "1px solid #2a2f36",
              background: "#151a20",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
