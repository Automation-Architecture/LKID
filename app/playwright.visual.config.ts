import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Visual Regression Configuration — LKID-81
 *
 * Dedicated config for visual regression tests against the Visx eGFR chart.
 * Chromium-only (per LKID-81 AC) so cross-browser sub-pixel variance doesn't
 * dominate the diff signal. Tight pixel threshold (0.1%) catches real chart
 * regressions while tolerating sub-pixel anti-aliasing.
 *
 * The Results page is a `"use client"` component that fetches
 * `GET ${NEXT_PUBLIC_API_URL}/results/{token}` from the browser, so all
 * backend calls can be intercepted via `page.route` — no live FastAPI
 * required in CI.
 *
 * Usage:
 *   npx playwright test --config=playwright.visual.config.ts
 *   npx playwright test --config=playwright.visual.config.ts --update-snapshots
 */
export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./tests/visual/test-results",
  snapshotDir: "./tests/visual/snapshots",

  /**
   * Template the snapshot path WITHOUT the `{platform}` token. The default is
   * `{snapshotDir}/{testFilePath}/{arg}{-projectName}{-platform}.png`, which
   * produces separate baselines for darwin/linux/win32 — fine for big visual
   * suites, but expensive when only one OS (Linux on CI) is the source of
   * truth. We commit baselines generated on Linux (in CI) and let local
   * macOS / Windows runs work against the same baseline.
   *
   * On first CI run, baselines won't exist — the workflow has an
   * `update-baselines` `workflow_dispatch` mode that regenerates them and
   * pushes back to the branch. See `.github/workflows/visual-regression.yml`.
   */
  snapshotPathTemplate:
    "{snapshotDir}/{testFilePath}-snapshots/{arg}{ext}",

  expect: {
    toHaveScreenshot: {
      /**
       * 0.1% pixel-ratio threshold — per LKID-81 AC. Tight enough to catch
       * any meaningful chart change (color shift, missing line, axis change),
       * loose enough to absorb sub-pixel anti-aliasing differences between
       * runs on the same OS / browser version.
       */
      maxDiffPixelRatio: 0.001,

      // Per-pixel color threshold (0-1). 0.2 absorbs minor anti-aliasing
      // color shifts without masking real palette changes.
      threshold: 0.2,
    },
  },

  // Fail fast in CI so diff PNGs surface immediately. One retry locally so
  // a transient flake doesn't ruin a baseline-update session.
  retries: process.env.CI ? 0 : 1,

  // Limit parallelism so we don't fight ourselves over the single dev server.
  workers: 1,
  fullyParallel: false,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "chromium-visual",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  // Run `next dev` for the test session unless one is already running on :3000.
  // No backend is started — the spec mocks all API calls via `page.route`.
  //
  // CRITICAL: `NEXT_PUBLIC_API_URL` MUST be set so that:
  //   1. `apiUrl()` (src/lib/api.ts) issues fetches to this origin, which
  //      Playwright then intercepts.
  //   2. `next.config.ts` includes this origin in the `connect-src` CSP
  //      directive — otherwise Chromium blocks the fetch before our
  //      `page.route` handler runs (LKID-87 enforced CSP, not Report-Only).
  // We use 127.0.0.1 (not localhost) to dodge any IPv6/IPv4 resolution
  // ambiguity — the route mock matcher is host-pinned to API_BASE.
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
