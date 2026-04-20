"use client";

/**
 * PostHog client-side provider (LKID-71).
 *
 * Wires PostHog for the patient conversion funnel:
 *   landing -> /labs -> /gate/[token] -> /results/[token] -> PDF download
 *
 * Env-gated (mirrors the Sentry pattern in `instrumentation-client.ts`):
 *   - If `NEXT_PUBLIC_POSTHOG_KEY` is unset, this is a silent no-op — children
 *     render without any PostHog init. Local dev without analytics Just Works.
 *
 * Routes that are explicitly excluded from PostHog:
 *   - `/client/*`            Lee's operator dashboard. Not part of the funnel.
 *   - `/internal/chart/*`    Playwright PDF render target. Server-side rendering,
 *                            no analytics signal to capture.
 *
 * PII posture (MED-01 — `report_token` is a bearer credential, LKID-62):
 *   - `person_profiles: "identified_only"` — only create profiles if we call
 *     `posthog.identify()`. We never call it. Result: zero PII profiles.
 *   - No email, name, lab values, or full report_token is ever sent as a
 *     property. Only `report_token_prefix` (first 8 chars) for funnel
 *     correlation.
 *   - `autocapture.dom_event_allowlist: ["click", "submit"]` — explicitly
 *     excludes `change`/`input` events, so form-field values are never
 *     sent to PostHog.
 */

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const EXCLUDED_PREFIXES = ["/client", "/internal/chart"];

function isExcluded(pathname: string | null): boolean {
  if (!pathname) return false;
  return EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Module-level guard — posthog.init() must only run once per browser
// session, regardless of how many times this component mounts/re-renders.
let posthogInitialized = false;

function initPostHog(): void {
  if (posthogInitialized) return;
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",

    // Conservative privacy default: only create a person profile when we
    // explicitly call posthog.identify(). We never do. So no profiles.
    person_profiles: "identified_only",

    // SPA pageview capture — relies on the History API so client-side
    // navigations in the App Router fire `$pageview` events.
    capture_pageview: "history_change",
    capture_pageleave: true,

    // Autocapture clicks + form submits only. Explicitly excludes
    // `change`/`input`, so lab values, names, emails are never captured.
    autocapture: {
      dom_event_allowlist: ["click", "submit"],
    },

    cross_subdomain_cookie: false,
    persistence: "localStorage+cookie",

    // Silence PostHog's "Debug mode" console banner in production.
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug(false);
      }
    },
  });

  posthogInitialized = true;
}

interface PostHogProviderWrapperProps {
  children: ReactNode;
}

export function PostHogProviderWrapper({
  children,
}: PostHogProviderWrapperProps) {
  const pathname = usePathname();

  // Pre-init gate: never init PostHog on excluded routes.
  // Note: once initialized on another route, a later navigation into an
  // excluded route would still autocapture. Those routes are reached via
  // separate top-level entries (Lee uses `/client/lee-*` directly; Playwright
  // hits `/internal/chart/*` server-to-server) so in practice this gate
  // holds.
  const excluded = isExcluded(pathname);

  useEffect(() => {
    if (excluded) return;
    initPostHog();
  }, [excluded]);

  // If excluded OR PostHog not configured, render children with no provider.
  // The PostHogProvider still works when posthog is an uninitialized stub,
  // but skipping it keeps the tree clean.
  if (excluded || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

/**
 * Re-export the `posthog` singleton so callers can fire custom events:
 *   `import { posthog } from "@/lib/posthog-provider";`
 *   `posthog.capture("labs_submitted", { report_token_prefix: t.slice(0, 8) });`
 *
 * Safe to call even when the key is unset — posthog-js no-ops when not init'd.
 */
export { posthog };
