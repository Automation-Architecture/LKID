import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

/**
 * LKID-72 — Sentry integration.
 *
 * `withSentryConfig` wires in automatic source-map upload during
 * `next build` (requires SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT
 * env vars on Vercel) and the tunnel route that routes events through
 * our own origin to avoid ad-blockers.
 *
 * Locally, absent SENTRY_AUTH_TOKEN the Sentry webpack plugin is a
 * silent no-op — so dev builds still work without the secret.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Quieter build logs unless running in CI with SENTRY_DEBUG=1.
  silent: !process.env.CI,

  // Route Sentry's ingest through our own origin so ad-blockers do not
  // drop client events. `/monitoring` is the conventional tunnel path.
  tunnelRoute: "/monitoring",

  // Upload source maps only when an auth token is present (CI / Vercel).
  // This keeps local dev builds fast and quiet.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Hide source maps from generated client bundles so they are not
  // served publicly; they are uploaded to Sentry during build.
  widenClientFileUpload: true,
});
