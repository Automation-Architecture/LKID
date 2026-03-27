import { test, expect } from "@playwright/test";

/**
 * Visual Regression Tests — Visx eGFR Trajectory Chart (LKID-48)
 *
 * Tests capture screenshots of the chart component under different data
 * scenarios and compare against baseline snapshots.
 *
 * Run:
 *   npx playwright test --config=playwright.visual.config.ts
 *
 * Update baselines:
 *   npx playwright test --config=playwright.visual.config.ts --update-snapshots
 *
 * These tests depend on:
 *   - The results page being accessible at /results
 *   - The Visx chart component rendering an <svg> element
 *   - Mock data or API stubs providing deterministic chart data
 *
 * TODO (Harshit): Wire up MSW or route interception to inject specific
 * prediction responses so chart renders are deterministic across runs.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wait for the Visx SVG chart to fully render and stabilize.
 *
 * Strategy:
 * 1. Wait for the <svg> element to appear in the DOM
 * 2. Wait for all path/line elements (trajectory lines) to be present
 * 3. Brief pause for any CSS transitions or animation frames to settle
 *
 * Findings from Yuri/Harshit pairing session (Task 1.2) should refine
 * these selectors and timing once the actual chart component is built.
 */
async function waitForChartStable(page: import("@playwright/test").Page) {
  // Wait for the SVG chart container to appear
  await page.waitForSelector("svg", { state: "visible", timeout: 15000 });

  // Wait for at least one path element (trajectory line) to render
  await page.waitForSelector("svg path", { state: "visible", timeout: 10000 });

  // Allow any animations or transitions to settle
  // Visx typically doesn't animate by default, but custom transitions
  // may be added. Adjust this if Harshit adds entrance animations.
  await page.waitForTimeout(500);

  // Ensure no pending network requests (chart data fully loaded)
  await page.waitForLoadState("networkidle");
}

/**
 * Inject mock prediction data via route interception.
 *
 * This ensures deterministic chart rendering regardless of backend state.
 * Each test case provides its own dataset to exercise different visual states.
 */
async function mockPredictResponse(
  page: import("@playwright/test").Page,
  responseData: Record<string, unknown>
) {
  await page.route("**/predict", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseData),
    });
  });
}

// ---------------------------------------------------------------------------
// Mock data for each test scenario
// ---------------------------------------------------------------------------

const TIME_POINTS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120];

/**
 * Single visit — Stage 3b patient, moderate decline.
 * Charts should show 4 trajectory lines diverging from baseline.
 */
const SINGLE_VISIT_DATA = {
  egfr_baseline: 38.0,
  confidence_tier: 1,
  trajectories: {
    no_treatment: [38.0, 37.8, 37.3, 36.7, 35.6, 34.5, 33.4, 31.3, 29.1, 27.0, 24.8, 22.7, 20.5, 18.4, 16.2],
    bun_18_24: [38.0, 39.0, 40.7, 41.0, 42.0, 42.6, 42.9, 41.4, 39.9, 38.4, 36.9, 35.4, 33.9, 32.4, 30.9],
    bun_13_17: [38.0, 39.6, 41.9, 42.4, 44.4, 45.7, 46.4, 45.4, 44.4, 43.4, 42.4, 41.4, 40.4, 39.4, 38.4],
    bun_12: [38.0, 40.4, 43.7, 44.6, 47.6, 49.5, 50.7, 50.2, 49.7, 49.2, 48.7, 48.2, 47.7, 47.2, 46.7],
  },
  time_points_months: TIME_POINTS,
  dial_ages: {
    no_treatment: 72.5,
    bun_18_24: null,
    bun_13_17: null,
    bun_12: null,
  },
  dialysis_threshold: 12.0,
  stat_cards: {
    egfr_baseline: 38.0,
    egfr_10yr_no_treatment: 16.2,
    egfr_10yr_best_case: 46.7,
    potential_gain_10yr: 30.5,
    bun_suppression_estimate: 7.8,
  },
};

/**
 * Multi-visit — 3+ visits showing clear trajectory.
 * Same patient profile but with Tier 2 confidence (hemoglobin + glucose present).
 */
const MULTI_VISIT_DATA = {
  ...SINGLE_VISIT_DATA,
  confidence_tier: 2,
  egfr_baseline: 42.0,
  trajectories: {
    no_treatment: [42.0, 41.8, 41.3, 40.5, 39.2, 37.9, 36.6, 34.0, 31.4, 28.8, 26.2, 23.6, 21.0, 18.4, 15.8],
    bun_18_24: [42.0, 43.2, 45.1, 45.5, 46.8, 47.5, 47.9, 46.4, 44.9, 43.4, 41.9, 40.4, 38.9, 37.4, 35.9],
    bun_13_17: [42.0, 43.9, 46.5, 47.1, 49.5, 51.0, 51.8, 50.8, 49.8, 48.8, 47.8, 46.8, 45.8, 44.8, 43.8],
    bun_12: [42.0, 44.8, 48.5, 49.6, 53.0, 55.2, 56.5, 56.0, 55.5, 55.0, 54.5, 54.0, 53.5, 53.0, 52.5],
  },
  dial_ages: {
    no_treatment: 75.1,
    bun_18_24: null,
    bun_13_17: null,
    bun_12: null,
  },
  stat_cards: {
    egfr_baseline: 42.0,
    egfr_10yr_no_treatment: 15.8,
    egfr_10yr_best_case: 52.5,
    potential_gain_10yr: 36.7,
    bun_suppression_estimate: 9.3,
  },
};

/**
 * Dialysis threshold — Stage 4 patient whose no-treatment trajectory
 * crosses below eGFR 12 within the chart timeframe.
 * The dialysis threshold line at eGFR=12 should be visually prominent.
 */
const DIALYSIS_THRESHOLD_DATA = {
  egfr_baseline: 18.0,
  confidence_tier: 1,
  trajectories: {
    no_treatment: [18.0, 17.7, 17.2, 16.4, 15.0, 13.5, 12.0, 9.0, 6.0, 3.0, 0, 0, 0, 0, 0],
    bun_18_24: [18.0, 19.5, 21.8, 22.2, 23.5, 24.3, 24.8, 23.3, 21.8, 20.3, 18.8, 17.3, 15.8, 14.3, 12.8],
    bun_13_17: [18.0, 20.0, 22.8, 23.5, 25.8, 27.3, 28.2, 27.2, 26.2, 25.2, 24.2, 23.2, 22.2, 21.2, 20.2],
    bun_12: [18.0, 21.0, 24.8, 25.8, 29.0, 31.2, 32.7, 32.2, 31.7, 31.2, 30.7, 30.2, 29.7, 29.2, 28.7],
  },
  time_points_months: TIME_POINTS,
  dial_ages: {
    no_treatment: 62.0,
    bun_18_24: null,
    bun_13_17: null,
    bun_12: null,
  },
  dialysis_threshold: 12.0,
  stat_cards: {
    egfr_baseline: 18.0,
    egfr_10yr_no_treatment: 0,
    egfr_10yr_best_case: 28.7,
    potential_gain_10yr: 28.7,
    bun_suppression_estimate: 12.4,
  },
};

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

test.describe("eGFR Chart Visual Regression", () => {
  test("single visit — 4 trajectory lines from Stage 3b baseline", async ({
    page,
  }) => {
    await mockPredictResponse(page, SINGLE_VISIT_DATA);
    await page.goto("/results");
    await waitForChartStable(page);

    await expect(page).toHaveScreenshot("chart-single-visit.png", {
      fullPage: false,
      // Clip to the chart area if a known container exists
      // clip: { x: 0, y: 100, width: 1280, height: 500 },
    });
  });

  test("multi-visit — 3+ visits with Tier 2 confidence", async ({ page }) => {
    await mockPredictResponse(page, MULTI_VISIT_DATA);
    await page.goto("/results");
    await waitForChartStable(page);

    await expect(page).toHaveScreenshot("chart-multi-visit.png", {
      fullPage: false,
    });
  });

  test("dialysis threshold — no-treatment crosses eGFR 12", async ({
    page,
  }) => {
    await mockPredictResponse(page, DIALYSIS_THRESHOLD_DATA);
    await page.goto("/results");
    await waitForChartStable(page);

    await expect(page).toHaveScreenshot("chart-dialysis-threshold.png", {
      fullPage: false,
    });
  });
});

test.describe("eGFR Chart — Responsive Snapshots", () => {
  test("chart renders correctly at mobile viewport", async ({ page }) => {
    await mockPredictResponse(page, SINGLE_VISIT_DATA);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/results");
    await waitForChartStable(page);

    await expect(page).toHaveScreenshot("chart-mobile.png", {
      fullPage: false,
      // Mobile may need slightly higher threshold due to cramped SVG scaling
      maxDiffPixelRatio: 0.015,
    });
  });
});
