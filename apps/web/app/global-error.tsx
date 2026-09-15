"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Last-resort error boundary — replaces the root layout, so it ships its own
 * html/body and inline styles (no dependency on the stylesheet loading).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#080A08",
          color: "#F7F2E8",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p
          style={{
            color: "#A6AAA4",
            fontSize: "14px",
            maxWidth: "340px",
            marginTop: "8px",
            lineHeight: 1.6,
          }}
        >
          An unexpected error occurred. Reloading usually fixes it — your work
          is safe.
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "28px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={reset}
            style={{
              backgroundColor: "#82EA3A",
              color: "#0D100E",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              color: "#A6AAA4",
              fontSize: "14px",
              textDecoration: "none",
              padding: "10px 8px",
            }}
          >
            Back to 5Pixels
          </Link>
        </div>
      </body>
    </html>
  );
}
