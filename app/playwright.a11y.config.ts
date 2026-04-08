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

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
