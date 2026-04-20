import { ClerkProvider } from "@clerk/nextjs";

/**
 * LKID-63: the patient funnel moved off Clerk into the /labs → /gate →
 * /results/[token] flow. The legacy /predict page still imports Clerk
 * hooks (useUser, useAuth), so we mount ClerkProvider in a route-level
 * layout for as long as /predict lives. LKID-66 deletes /predict and
 * this layout together.
 */
export default function PredictLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
      {children}
    </ClerkProvider>
  );
}
