/**
 * Next.js 16 instrumentation hook (LKID-72).
 *
 * Dispatches Sentry server/edge config based on runtime. Exports
 * `onRequestError` so Sentry captures server-side errors from Server
 * Components, route handlers, and the `src/proxy.ts` auth proxy.
 *
 * Reference: Sentry Next.js manual setup guide (v10.x / Next 15+).
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture errors from Server Components, middleware/proxy, and route handlers.
export const onRequestError = Sentry.captureRequestError;
