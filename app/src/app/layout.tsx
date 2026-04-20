import type { Metadata } from "next";
import { Inter, Manrope, Nunito_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SkipNav } from "@/components/skip-nav";
import { PostHogProviderWrapper } from "@/lib/posthog-provider";
import "./globals.css";

// Inter kept for the client dashboard surface (brand-teal/brand-lime) and any
// page that doesn't opt into the patient-funnel `.kh-*` styling wrappers.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// LKID-76: load Manrope + Nunito Sans globally so display/body fonts are
// applied sitewide (including `/results/[token]`, which has no local
// `.kh-*` wrapper). Previously each of Landing/Labs/Gate imported these
// locally; Results therefore fell back to Inter. By exposing the variables
// at the <html> level, globals.css can set body → Nunito Sans and headings
// → Manrope on every page regardless of whether the page defines its own
// scoped wrapper.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * LKID-73 — SEO basics.
 *
 * `metadataBase` is required for relative OG image paths (e.g. `/opengraph-image`
 * produced by `app/opengraph-image.tsx`) to resolve to absolute URLs. Defaults
 * to the Vercel preview domain; Brad can swap to https://kidneyhood.org once
 * DNS lands (Sprint 4 Brad-hands backlog).
 *
 * Tokenized routes (`/results/[token]`, `/gate/[token]`, `/internal/chart/[token]`)
 * carry `robots: { index: false, follow: false }` via their own route-level
 * metadata so search engines never index a report URL. robots.txt
 * (`app/robots.ts`) adds a belt-and-braces disallow and covers the FastAPI
 * `/reports/{token}/pdf` endpoint, which is served from the backend and
 * cannot carry HTML meta tags.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://kidneyhood-automation-architecture.vercel.app";

const SITE_TITLE = "KidneyHood — Understand your kidney health";
const SITE_DESCRIPTION =
  "See what your lab results mean and how your kidney health may change over time. Plain-language kidney health check — no account needed, takes less than a minute.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — KidneyHood",
  },
  description: SITE_DESCRIPTION,
  applicationName: "KidneyHood",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "KidneyHood",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "KidneyHood — Understand your kidney health",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

/**
 * LKID-63: ClerkProvider moved out of the root layout into the
 * `client/[slug]` subtree. The patient funnel (`/labs`, `/gate/[token]`,
 * `/results/[token]`, `/internal/chart/[token]`) no longer requires auth.
 * Legacy `/auth` and `/predict` pages deleted in LKID-66.
 *
 * LKID-76: Manrope + Nunito Sans font variables added so all pages inherit
 * the brand type stack. Locally-scoped imports in `page.tsx`, `labs/page.tsx`,
 * and `gate/[token]/page.tsx` remain (harmless) while the variables are
 * now attached at the <html> level for Results and any future page that
 * does not wrap itself in a `.kh-*` shell.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SkipNav />
        <PostHogProviderWrapper>{children}</PostHogProviderWrapper>
        <Analytics />
      </body>
    </html>
  );
}
