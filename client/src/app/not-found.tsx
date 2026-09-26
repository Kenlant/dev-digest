/* 404 for unknown URLs and for any `notFound()` call.
   Server Component on purpose — nothing here needs interactivity, so a bad URL
   costs no client JS. `/repos/:repoId` that doesn't exist is NOT this: it keeps
   its friendlier in-app RepoNotFound empty state. */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 10,
        minHeight: "60vh",
        padding: "80px 24px",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Page not found</h1>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 420 }}>
        That URL doesn’t match any DevDigest screen.
      </p>
      <Link
        href="/"
        style={{
          marginTop: 8,
          padding: "8px 16px",
          fontSize: 14,
          borderRadius: 6,
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          textDecoration: "none",
        }}
      >
        Back to DevDigest
      </Link>
    </div>
  );
}
