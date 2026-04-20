"use client";

/**
 * Global error boundary (LKID-72).
 *
 * App Router convention — catches React render-tree errors that escape
 * `error.tsx` boundaries (including the root layout itself). Sentry's
 * Next.js guide requires this file to route client render errors into
 * Sentry via `Sentry.captureUnderscoreErrorException`.
 *
 * Kept intentionally minimal: the happy path does not hit this, and the
 * error-path UI must not itself throw. The link home is a plain <a> so we
 * never depend on the Next router (which may itself be in a broken state).
 */
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          padding: "2rem",
          maxWidth: "32rem",
          margin: "0 auto",
        }}
      >
        <h1>Something went wrong</h1>
        <p>
          We hit an unexpected error. Please try again, or{" "}
          {/* Plain anchor (not next/link) — the router may itself be in a
              broken state when this boundary fires. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">return home</a>.
        </p>
      </body>
    </html>
  );
}
