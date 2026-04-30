<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Playwright + enforced CSP (LKID-87 / LKID-93)

Every Playwright config that starts a `next dev` server **must** set `NEXT_PUBLIC_API_URL: "http://127.0.0.1:8000"` in `webServer.env`. Without it:

1. `apiUrl()` (`src/lib/api.ts`) falls back to `localhost:8000` for client-side fetches.
2. `next.config.ts::backendOrigin()` reads `NEXT_PUBLIC_API_URL` at startup and emits the origin into the enforced CSP `connect-src`. A missing/mismatched value means Chromium blocks the fetch before `page.route()` fires.
3. The page stays on its loading skeleton and every `waitFor` times out.

Reference implementations: `playwright.visual.config.ts` and `playwright.a11y.config.ts` — both set this env var.
