import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Visual Regression Configuration — LKID-48
 *
 * Dedicated config for visual regression tests against the Visx eGFR chart.
 * Separated from any future e2e config to allow independent runs and
 * different snapshot settings.
 *
 * Usage:
 *   npx playwright test --config=playwright.visual.config.ts
 *   npx playwright test --config=playwright.visual.config.ts --update-snapshots
 */
export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./tests/visual/test-results",
  snapshotDir: "./tests/visual/snapshots",

  // Snapshot comparison settings
  expect: {
    toHaveScreenshot: {
      /**
       * Pixel diff threshold: 1% of total pixels.
       *
       * Rationale: SVG chart rendering has minor anti-aliasing differences
       * across browser engines (especially WebKit). 1% allows for these
       * sub-pixel rendering variations while still catching meaningful
       * visual regressions like missing data series, wrong axis labels,
       * or broken layout.
       *
       * Per-browser overrides can be set in individual test files if
       * needed (e.g., WebKit may need 1.5% due to font rendering).
       */
      maxDiffPixelRatio: 0.01,

      // Threshold for individual pixel color difference (0-1 scale)
      // 0.2 allows slight anti-aliasing color shifts
      threshold: 0.2,
    },
  },

  // Fail fast in CI, retry locally for flake investigation
  retries: process.env.CI ? 0 : 1,

  // Reporter
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],

  // Shared settings for all visual regression tests
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    // Consistent viewport for snapshot reproducibility
    viewport: { width: 1280, height: 720 },
    // Disable animations for deterministic screenshots
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Cross-browser projects
  projects: [
    {
      name: "chromium-visual",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "firefox-visual",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "webkit-visual",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 720 },
        // WebKit SVG rendering can differ more; allow slightly higher threshold
        // Override in test file if needed:
        //   expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.015 });
      },
    },
  ],

  // Start local dev server if not already running
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
