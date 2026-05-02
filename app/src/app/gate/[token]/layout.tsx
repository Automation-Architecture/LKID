import type { Metadata } from "next";
import { Header } from "@/components/header";

/**
 * LKID-73 — Email-gate pages for tokenized reports must never be indexed.
 * The sibling `page.tsx` is a client component, so metadata lives here in
 * the server-component layout.
 */
export const metadata: Metadata = {
  title: "View your results",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function GateTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
