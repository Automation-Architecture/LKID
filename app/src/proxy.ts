import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Clerk auth proxy — LKID-60
 *
 * Next.js 16 renamed middleware.ts → proxy.ts. Clerk v7's clerkMiddleware()
 * works as-is inside the proxy convention. Matched routes pass through Clerk
 * for JWT verification. Public routes (home, client dashboard, internal pages)
 * are accessible without authentication.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/auth(.*)",
  "/client(.*)",
  "/internal(.*)",
  "/predict(.*)",
  "/results(.*)",
  // LKID-63 new tokenized funnel — no-auth by design (token IS the credential)
  "/labs(.*)",
  "/gate(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
