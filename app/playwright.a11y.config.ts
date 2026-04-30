import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Accessibility Configuration — LKID-26
 *
 * axe-core audit: zero critical/serious WCAG 2.1 AA violations on all pages.
 *
 * Usage:
 *   npx playwright test --config=playwright.a11y.config.ts
 */
export default defineConfig({
  testDir: "./tests/a11y",
  outputDir: "./tests/a11y/test-results",

  retries: process.env.CI ? 1 : 0,
  timeout: 30000,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "chromium-a11y",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Run `next dev` for the test session unless one is already running on :3000.
  // No backend is started — specs that hit `/gate/[token]` or `/results/[token]`
  // mock all API calls via `page.route`.
  //
  // CRITICAL (LKID-93): `NEXT_PUBLIC_API_URL` MUST be set so that:
  //   1. `apiUrl()` (src/lib/api.ts) issues fetches to this origin, which
  //      Playwright then intercepts.
  //   2. `next.config.ts` includes this origin in the `connect-src` CSP
  //      directive — otherwise Chromium blocks the fetch before our
  //      `page.route` handler runs (LKID-87 enforced CSP, not Report-Only).
  //
  // Without this env var, the CSP `connect-src` falls back to the production
  // Railway origin while the browser tries to fetch `localhost:8000`, the
  // fetch is CSP-blocked, the page never leaves its loading skeleton, and
  // `getByTestId("results-heading"|"gate-form").waitFor()` times out. This
  // mirrors the working setup in `playwright.visual.config.ts`.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:8000",
    },
  },
});
