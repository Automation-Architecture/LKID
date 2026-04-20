import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "KidneyHood — Project Dashboard",
  description: "Client progress dashboard for KidneyHood",
};

/**
 * LKID-63: ClerkProvider is now scoped to the client dashboard subtree so
 * the patient funnel can operate without Clerk in scope. Nothing else
 * about the dashboard chrome has changed.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/client"
      signUpFallbackRedirectUrl="/client"
      appearance={{
        variables: {
          colorPrimary: "#004D43",
          borderRadius: "0.5rem",
          fontSize: "1rem",
        },
      }}
    >
      <div className="min-h-screen" style={{ backgroundColor: "var(--brand-cream)" }}>
        <header className="border-b" style={{ borderColor: "var(--brand-divider)", backgroundColor: "var(--brand-teal)" }}>
          <div className="mx-auto flex h-14 max-w-[1024px] items-center px-6">
            <span className="text-base font-bold text-white">KidneyHood</span>
            <span className="ml-3 text-sm" style={{ color: "var(--brand-lime)" }}>
              Project Dashboard
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-[1024px] px-6 py-10 md:px-8 lg:px-0">
          {children}
        </main>
        <footer className="mt-16 border-t py-6 text-center text-xs" style={{ borderColor: "var(--brand-divider)", color: "var(--brand-gray)" }}>
          <p>Powered by Automation Architecture</p>
          <p className="mt-1">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        </footer>
      </div>
    </ClerkProvider>
  );
}
