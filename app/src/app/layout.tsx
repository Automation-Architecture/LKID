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

export const metadata: Metadata = {
  title: "KidneyHood",
  description: "Track your kidney health with eGFR trajectory predictions",
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
