/**
 * Sentry client-side initialization (LKID-72).
 *
 * Next.js 15+ convention: client-side Sentry init lives in
 * `instrumentation-client.ts`, not the legacy `sentry.client.config.ts`.
 * Next.js loads this automatically in the browser runtime.
 *
 * Policy:
 * - Session replay is OFF for MVP (privacy-conservative default for a
 *   health-adjacent app).
 * - Tracing sample rate pinned at 10% in production; 100% in dev for
 *   debugging.
 * - `beforeSend` scrubs `report_token` from URLs + breadcrumbs. The token
 *   is a 256-bit bearer credential (MED-01 from LKID-62) and must never
 *   land in Sentry logs.
 */
import * as Sentry from "@sentry/nextjs";

const REPORT_TOKEN_PATH_RE =
  /\/(results|gate|reports)\/[A-Za-z0-9_-]{20,}/g;

const scrub = (value: string | undefined): string | undefined =>
  value?.replace(REPORT_TOKEN_PATH_RE, "/$1/[REDACTED]");

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% in dev, 10% in production to stay under Sentry free-tier quota.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session replay OFF — privacy-conservative default for a health app.
  // Revisit in a future sprint if we need to debug UX friction.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Environment + release correlation for filtering in Sentry dashboard.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Drop events entirely when no DSN is configured (local dev without Sentry).
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Scrub report_token from URLs + breadcrumbs. Tokens are bearer credentials
  // (LKID-62 MED-01); they must never be visible in Sentry payloads.
  beforeSend(event) {
    if (event.request?.url) {
      event.request.url = scrub(event.request.url);
    }
    if (event.breadcrumbs) {
      for (const crumb of event.breadcrumbs) {
        if (crumb.data && typeof crumb.data.url === "string") {
          crumb.data.url = scrub(crumb.data.url);
        }
        if (typeof crumb.message === "string") {
          crumb.message = scrub(crumb.message);
        }
      }
    }
    return event;
  },
});

// Router transition instrumentation — gives Sentry spans for client-side
// navigations between `/labs` -> `/gate/[token]` -> `/results/[token]`.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
