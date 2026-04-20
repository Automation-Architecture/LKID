import type { MetadataRoute } from "next";

/**
 * LKID-73 — sitemap.xml (App Router convention).
 *
 * Only the two public, indexable surfaces are listed. Tokenized and
 * auth-gated routes are deliberately omitted (see `robots.ts` for
 * disallow rules).
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://kidneyhood-automation-architecture.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/labs`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
