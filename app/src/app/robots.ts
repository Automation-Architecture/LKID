import type { MetadataRoute } from "next";

/**
 * LKID-73 — robots.txt (App Router convention).
 *
 * Public surfaces are `/` (landing) and `/labs` (entry form). Everything
 * tokenized or client-private is disallowed so crawlers never index a
 * report URL:
 *   - `/results/` — patient report viewer
 *   - `/gate/`    — email-capture gate
 *   - `/reports/` — FastAPI PDF endpoint (backend; robots.txt is the
 *                   only mechanism since it serves binary PDF)
 *   - `/internal/` — Playwright PDF render target
 *   - `/client/`   — Lee's client dashboard (auth-gated but we also
 *                    keep it out of search results)
 *   - `/monitoring` — Sentry tunnel route (LKID-72 / next.config.ts)
 *
 * Base URL follows `NEXT_PUBLIC_APP_URL` so a flip to kidneyhood.org
 * needs no code change once DNS lands.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://kidneyhood-automation-architecture.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/results/",
          "/gate/",
          "/reports/",
          "/internal/",
          "/client/",
          "/monitoring",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
