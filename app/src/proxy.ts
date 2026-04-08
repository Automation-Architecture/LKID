import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk auth proxy — LKID-60
 *
 * Next.js 16 renamed middleware.ts → proxy.ts. Clerk v7's clerkMiddleware()
 * works as-is inside the proxy convention. All routes pass through Clerk
 * for JWT verification; public routes are handled client-side via ClerkProvider.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
