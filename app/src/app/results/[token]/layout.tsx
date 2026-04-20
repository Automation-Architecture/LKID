import type { Metadata } from "next";

/**
 * LKID-73 — Tokenized report URLs must never be indexed by search engines.
 * The sibling `page.tsx` is a client component, so we expose `metadata`
 * from this server-component layout instead.
 *
 * `robots.ts` also disallows `/results/` — this is belt-and-braces so a
 * bot that ignores robots.txt still sees `<meta name="robots" content="noindex,
 * nofollow">` in the rendered HTML.
 */
export const metadata: Metadata = {
  title: "Your results",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ResultsTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
