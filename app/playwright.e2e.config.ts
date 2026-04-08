import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Configuration — LKID-28
 *
 * Integration tests for the full user journey:
 *   form → predict → results → PDF download
 *
 * Usage:
 *   npx playwright test --config=playwright.e2e.config.ts
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/e2e/test-results",

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
      name: "chromium-e2e",
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
