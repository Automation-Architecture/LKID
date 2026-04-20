import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * LKID-74 — Content-Security-Policy + security headers.
 *
 * Strategy (Report-Only first):
 *   - Ship CSP in Report-Only mode so violations surface in the browser
 *     console / `report-uri` collector WITHOUT breaking the app.
 *   - After a clean 72-hour window, switch `Content-Security-Policy-Report-Only`
 *     to `Content-Security-Policy` in a follow-up PR.
 *
 * Known tradeoffs (documented on the PR):
 *   - `'unsafe-inline'` + `'unsafe-eval'` in script-src are load-bearing
 *     for Next.js production bundles without a nonce pipeline. A nonce-
 *     based CSP is a larger refactor and out of scope for LKID-74.
 *   - Google Fonts hosts (`fonts.googleapis.com` / `fonts.gstatic.com`)
 *     are whitelisted defensively even though `next/font/google` self-
 *     hosts at build time — cheap insurance if a future change switches
 *     to runtime loading.
 */

// Whitelist hosts for third-party integrations wired into the app.
// Sentry — `tunnelRoute: "/monitoring"` routes most traffic same-origin,
// but we keep the ingest hosts as belt-and-suspenders.
const SENTRY_HOSTS = [
  "https://*.sentry.io",
  "https://*.ingest.sentry.io",
].join(" ");

// PostHog — `api_host` defaults to https://us.i.posthog.com; the JS bundle
// is served from us-assets.i.posthog.com. `https://*.i.posthog.com` covers
// both. Legacy app.posthog.com included for compatibility.
const POSTHOG_HOSTS = [
  "https://*.posthog.com",
  "https://*.i.posthog.com",
  "https://us.i.posthog.com",
  "https://us-assets.i.posthog.com",
  "https://app.posthog.com",
  "https://eu.i.posthog.com",
].join(" ");

// Clerk — scoped to /client/* subtree but CSP applies to every response.
// `*.clerk.accounts.dev` covers dev/preview; `*.clerk.com` covers prod.
const CLERK_HOSTS = [
  "https://*.clerk.com",
  "https://*.clerk.accounts.dev",
  "https://clerk-telemetry.com",
  "https://*.clerk-telemetry.com",
].join(" ");

// Vercel Analytics — `<Analytics />` ships from va.vercel-scripts.com.
const VERCEL_ANALYTICS_HOSTS = [
  "https://va.vercel-scripts.com",
  "https://vitals.vercel-insights.com",
].join(" ");

// Railway backend — `NEXT_PUBLIC_API_URL` in production.
// Confirmed from .github/workflows/post-deploy-smoke.yml.
const BACKEND_HOST = "https://kidneyhood-backend-production.up.railway.app";

// Full CSP policy string — kept as a constant so the PR body can link to
// the exact source of truth.
const CSP_POLICY = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${SENTRY_HOSTS} ${POSTHOG_HOSTS} ${CLERK_HOSTS} ${VERCEL_ANALYTICS_HOSTS}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `img-src 'self' data: blob: https://*.posthog.com https://*.sentry.io https://img.clerk.com`,
  `connect-src 'self' ${SENTRY_HOSTS} ${POSTHOG_HOSTS} ${CLERK_HOSTS} ${VERCEL_ANALYTICS_HOSTS} ${BACKEND_HOST}`,
  `worker-src 'self' blob:`,
  `frame-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
].join("; ");

// Security headers that apply to every response.
// `Content-Security-Policy-Report-Only` is used for the first deploy so a
// bad whitelist entry cannot break the app. Flip to `Content-Security-Policy`
// in a follow-up after a clean 72-hour window.
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy-Report-Only",
    value: CSP_POLICY,
  },
  {
    // HSTS — force HTTPS for 1 year incl. subdomains, and submit for
    // preload list eligibility. Vercel serves all traffic over HTTPS in
    // production; the header is a no-op on localhost.
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    // Redundant with frame-ancestors 'none' but still respected by older
    // browsers that do not implement CSP3.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Disable browser APIs we do not use. Keeps the attack surface tight
    // even if a dependency injects an <iframe> or similar.
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()",
  },
  {
    // Minor perf win — lets the browser resolve cross-origin hostnames
    // ahead of navigation. Safe to enable.
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to every response. Next.js's `source` pattern uses path-to-
        // regexp semantics; `/(.*)` matches every path including the root.
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
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
 *
 * LKID-74 — `withSentryConfig` is a shallow wrapper that preserves
 * top-level keys on the Next.js config, so our `async headers()` above
 * survives intact. Verified via `next build` which emits all 7 headers.
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
