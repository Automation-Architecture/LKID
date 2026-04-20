import { ClerkProvider } from "@clerk/nextjs";

/**
 * LKID-63: /auth uses Clerk's useSignIn hook, so ClerkProvider lives in
 * a route-level layout now that the root layout no longer provides one.
 * Deleted together with /auth in LKID-66.
 */
export default function AuthLayout({
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
