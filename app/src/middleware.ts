import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Clerk middleware disabled — Next.js 16 deprecated the middleware file convention
// and clerkMiddleware() is failing at runtime (MIDDLEWARE_INVOCATION_FAILED).
// Full Clerk v7 + Next.js 16 migration deferred to Sprint 3.
// All routes are currently public (auth UI still works client-side).

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
