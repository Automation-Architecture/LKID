import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          signInFallbackRedirectUrl="/predict"
          signUpFallbackRedirectUrl="/predict"
          appearance={{
            variables: {
              colorPrimary: "#004D43",
              borderRadius: "0.5rem",
              fontSize: "1rem",
            },
          }}
        >
          <SkipNav />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
