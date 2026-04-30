import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Visual Regression Tests — Visx eGFR Trajectory Chart (LKID-81)
 *
 * What this validates:
 *   The chart SVG (`[data-testid="egfr-chart-svg"]`) renders a known set of
 *   trajectories pixel-equivalently to its committed baseline. Any
 *   meaningful change — color, missing line, layout shift, font swap —
 *   surfaces as a diff PNG in CI.
 *
 * How it works:
 *   `/results/[token]` is a `"use client"` component that fetches
 *   `GET ${NEXT_PUBLIC_API_URL}/results/{token}` in a `useEffect`. Playwright
 *   intercepts that fetch via `page.route` and serves a deterministic
 *   `captured: true` payload, so the chart renders without any live backend.
 *
 *   The `prediction-flow.spec.ts` E2E suite uses the same pattern. Reusing it
 *   here keeps mocking strategy in one place.
 *
 * Run:
 *   npx playwright test --config=playwright.visual.config.ts
 *
 * Update baselines (only after intentional design changes — see README):
 *   npx playwright test --config=playwright.visual.config.ts --update-snapshots
 */

// ---------------------------------------------------------------------------
// Mocking helpers — keep in sync with `prediction-flow.spec.ts`
// ---------------------------------------------------------------------------

// Must match `NEXT_PUBLIC_API_URL` in playwright.visual.config.ts `webServer.env`.
// The dev server's `apiUrl()` will issue fetches to this origin, which we
// intercept below — and the build-time CSP `connect-src` whitelists this exact
// origin so Chromium doesn't block the fetch before our route handler runs.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TIME_POINTS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120];

interface Trajectories {
  no_treatment: number[];
  bun_18_24: number[];
  bun_13_17: number[];
  bun_12: number[];
}

interface PredictionResult {
  egfr_baseline: number;
  confidence_tier: 1 | 2 | 3;
  trajectories: Trajectories;
  time_points_months: number[];
  dial_ages: {
    no_treatment: number | null;
    bun_18_24: number | null;
    bun_13_17: number | null;
    bun_12: number | null;
  };
  dialysis_threshold: number;
  stat_cards: {
    egfr_baseline: number;
    egfr_10yr_no_treatment: number;
    egfr_10yr_best_case: number;
    potential_gain_10yr: number;
    bun_suppression_estimate: number;
  };
  bun_suppression_estimate: number;
}

/**
 * Stage 3a baseline (eGFR ≈ 50). No-treatment line declines slowly; treatment
 * lines bend upward. Dialysis threshold band is below the visible y-range,
 * so the dashed line + label sit at the chart floor.
 */
const STAGE_3A_RESULT: PredictionResult = {
  egfr_baseline: 50.0,
  confidence_tier: 1,
  trajectories: {
    no_treatment: [50.0, 49.7, 49.0, 48.0, 46.0, 44.0, 42.0, 38.0, 34.0, 30.0, 26.0, 22.0, 18.0, 14.0, 10.0],
    bun_18_24:    [50.0, 51.0, 52.5, 53.0, 54.0, 54.4, 54.5, 53.0, 51.5, 50.0, 48.5, 47.0, 45.5, 44.0, 42.5],
    bun_13_17:    [50.0, 51.6, 53.8, 54.4, 56.0, 57.1, 57.6, 56.6, 55.6, 54.6, 53.6, 52.6, 51.6, 50.6, 49.6],
    bun_12:       [50.0, 52.4, 55.6, 56.5, 59.2, 61.0, 62.0, 61.5, 61.0, 60.5, 60.0, 59.5, 59.0, 58.5, 58.0],
  },
  time_points_months: TIME_POINTS,
  dial_ages: { no_treatment: 78.0, bun_18_24: null, bun_13_17: null, bun_12: null },
  dialysis_threshold: 12.0,
  stat_cards: {
    egfr_baseline: 50.0,
    egfr_10yr_no_treatment: 10.0,
    egfr_10yr_best_case: 58.0,
    potential_gain_10yr: 48.0,
    bun_suppression_estimate: 7.6,
  },
  bun_suppression_estimate: 7.6,
};

/**
 * Stage 4 baseline (eGFR ≈ 18). No-treatment line crosses the dialysis
 * threshold (12) within the chart window — the dashed threshold line +
 * tinted band + endpoint callouts all light up.
 */
const STAGE_4_RESULT: PredictionResult = {
  egfr_baseline: 18.0,
  confidence_tier: 1,
  trajectories: {
    no_treatment: [18.0, 17.7, 17.2, 16.4, 15.0, 13.5, 12.0, 9.0, 6.0, 3.0, 0, 0, 0, 0, 0],
    bun_18_24:    [18.0, 19.5, 21.8, 22.2, 23.5, 24.3, 24.8, 23.3, 21.8, 20.3, 18.8, 17.3, 15.8, 14.3, 12.8],
    bun_13_17:    [18.0, 20.0, 22.8, 23.5, 25.8, 27.3, 28.2, 27.2, 26.2, 25.2, 24.2, 23.2, 22.2, 21.2, 20.2],
    bun_12:       [18.0, 21.0, 24.8, 25.8, 29.0, 31.2, 32.7, 32.2, 31.7, 31.2, 30.7, 30.2, 29.7, 29.2, 28.7],
  },
  time_points_months: TIME_POINTS,
  dial_ages: { no_treatment: 62.0, bun_18_24: null, bun_13_17: null, bun_12: null },
  dialysis_threshold: 12.0,
  stat_cards: {
    egfr_baseline: 18.0,
    egfr_10yr_no_treatment: 0,
    egfr_10yr_best_case: 28.7,
    potential_gain_10yr: 28.7,
    bun_suppression_estimate: 12.4,
  },
  bun_suppression_estimate: 12.4,
};

const VALID_INPUTS = {
  bun: 16,
  creatinine: 3.2,
  potassium: 4.5,
  age: 58,
  sex: "unknown",
};

interface Scenario {
  name: string;
  token: string;
  result: PredictionResult;
  /** Expected count of trajectory `<path>` elements — wait gate. */
  trajectoryPathCount: number;
}

const SCENARIOS: Scenario[] = [
  {
    name: "stage-3a-baseline",
    token: "vr-stage-3a-token",
    result: STAGE_3A_RESULT,
    trajectoryPathCount: 4,
  },
  {
    name: "stage-4-baseline",
    token: "vr-stage-4-token",
    result: STAGE_4_RESULT,
    trajectoryPathCount: 4,
  },
];

/**
 * Mock the `GET /results/{token}` backend call that the client-side Results
 * page issues on mount. `captured: true` so the page renders the chart
 * directly (no `/gate` redirect, no email-capture flow).
 */
async function mockResultsGet(page: Page, scenario: Scenario) {
  // Pin to the API host specifically so the page-route navigation (Next.js
  // resolving /results/[token] on :3000) is NOT intercepted — only the
  // backend GET that the client-side ResultsTokenPage issues.
  const pattern = new RegExp(
    `^${escapeRegExp(API_BASE)}/results/${escapeRegExp(scenario.token)}(?:\\?.*)?$`,
  );
  await page.route(pattern, (route: Route) => {
    if (route.request().method() !== "GET") {
      return route.continue();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        report_token: scenario.token,
        captured: true,
        created_at: "2026-04-30T00:00:00Z",
        result: scenario.result,
        inputs: VALID_INPUTS,
        lead: {
          name: "VR Test",
          email: "vr@kidneyhood.test",
          email_captured_at: "2026-04-30T00:00:00Z",
        },
      }),
    });
  });
}

/**
 * Disable CSS animations + transitions so the loading skeleton's `kh-pulse`
 * keyframe and any visx hover transitions can't shift pixels mid-screenshot.
 */
async function disableAnimations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      .skeleton { animation: none !important; }
    `,
  });
}

/**
 * Wait for the chart to be fully painted: SVG present, expected number of
 * trajectory paths, fonts loaded, and a stable bounding box.
 */
async function waitForChartStable(page: Page, expectedPathCount: number) {
  // 1. The SVG container must mount (replaces the skeleton).
  await page.waitForSelector('[data-testid="egfr-chart-svg"]', {
    state: "visible",
    timeout: 15_000,
  });

  // 2. All four trajectory lines must be in the DOM. Visx renders via React,
  //    so this wait protects against capturing a partial render.
  await expect(
    page.locator('[data-testid^="trajectory-line-"]'),
  ).toHaveCount(expectedPathCount, { timeout: 10_000 });

  // 3. Fonts (next/font Manrope + Nunito Sans) must be loaded — otherwise
  //    a baseline taken with fallback fonts diffs against a CI run that
  //    waited a tick longer.
  await page.evaluate(() => document.fonts.ready);

  // 4. Force layout to settle.
  await page.waitForFunction(() => {
    const svg = document.querySelector(
      '[data-testid="egfr-chart-svg"]',
    ) as SVGSVGElement | null;
    if (!svg) return false;
    const box = svg.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("eGFR Chart — visual regression", () => {
  for (const scenario of SCENARIOS) {
    test(`chart matches baseline — ${scenario.name}`, async ({ page }) => {
      await mockResultsGet(page, scenario);
      await page.goto(`/results/${scenario.token}`);
      await disableAnimations(page);
      await waitForChartStable(page, scenario.trajectoryPathCount);

      const chart = page.locator('[data-testid="egfr-chart-svg"]');
      await expect(chart).toHaveScreenshot(`chart-${scenario.name}.png`);
    });
  }
});
