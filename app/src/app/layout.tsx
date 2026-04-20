import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SkipNav } from "@/components/skip-nav";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KidneyHood",
  description: "Track your kidney health with eGFR trajectory predictions",
};

/**
 * LKID-63: ClerkProvider moved out of the root layout into the
 * `client/[slug]` subtree. The patient funnel (`/labs`, `/gate/[token]`,
 * `/results/[token]`, `/internal/chart/[token]`) no longer requires auth.
 * The existing `/auth` and `/predict` pages still import Clerk hooks and
 * will fail at runtime until LKID-66 deletes them — this is expected and
 * tracked.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SkipNav />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
