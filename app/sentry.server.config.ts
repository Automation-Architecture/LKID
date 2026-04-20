/**
 * Sentry server-side initialization (LKID-72).
 *
 * Loaded by `instrumentation.ts#register()` when NEXT_RUNTIME === "nodejs".
 * Covers Server Components, route handlers, and the Vercel Node runtime.
 */
import * as Sentry from "@sentry/nextjs";

const REPORT_TOKEN_PATH_RE =
  /\/(results|gate|reports)\/[A-Za-z0-9_-]{20,}/g;

const scrub = (value: string | undefined): string | undefined =>
  value?.replace(REPORT_TOKEN_PATH_RE, "/$1/[REDACTED]");

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  enabled: Boolean(
    process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  ),

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
