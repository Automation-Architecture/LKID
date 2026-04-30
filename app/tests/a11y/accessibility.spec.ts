import { test, expect, Page, Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility Tests — LKID-26 / LKID-65
 *
 * axe-core audit: zero critical/serious WCAG 2.1 AA violations on all pages.
 * Target demographic is 60+ CKD patients — accessibility is non-negotiable.
 *
 * Updated for the tokenized flow (LKID-63):
 *   /labs, /gate/[token], /results/[token]
 *
 * Run:
 *   npx playwright test --config=playwright.a11y.config.ts
 */

const TEST_TOKEN = "test-token-abc123";

// Backend API origin — scope route mocks to this origin so the
// `page.goto('/results/[token]')` page navigation is not intercepted by
// the mock (otherwise Playwright short-circuits the page load itself).
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const RESULTS_API_URL = `${API_BASE}/results/${TEST_TOKEN}`;

const MOCK_PREDICTION_RESULT = {
  egfr_baseline: 28.0,
  confidence_tier: 1,
  trajectories: {
    no_treatment: [28.0, 27.8, 27.3, 26.5, 25.0, 23.5, 22.0, 19.0, 16.0, 13.0, 10.0, 7.0, 4.0, 1.0, 0],
    bun_18_24: [28.0, 28.1, 28.3, 27.8, 27.0, 26.2, 25.3, 23.5, 21.7, 19.8, 18.0, 16.2, 14.3, 12.5, 10.7],
    bun_13_17: [28.0, 28.1, 28.3, 27.8, 26.8, 25.8, 24.8, 22.8, 20.8, 18.8, 16.8, 14.8, 12.8, 10.8, 8.8],
    bun_12: [28.0, 28.1, 28.3, 28.0, 27.6, 27.1, 26.7, 26.0, 25.4, 24.7, 24.1, 23.4, 22.8, 22.1, 21.5],
  },
  time_points_months: [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120],
  dial_ages: { no_treatment: 67.5, bun_18_24: null, bun_13_17: null, bun_12: null },
  dialysis_threshold: 12.0,
  stat_cards: {
    egfr_baseline: 28.0,
    egfr_10yr_no_treatment: 0,
    egfr_10yr_best_case: 21.5,
    potential_gain_10yr: 21.5,
    bun_suppression_estimate: 1.9,
  },
  bun_suppression_estimate: 1.9,
};

function buildResultsResponse(captured: boolean) {
  return {
    report_token: TEST_TOKEN,
    captured,
    result: MOCK_PREDICTION_RESULT,
    inputs: { bun: 16, creatinine: 3.2, potassium: 4.5, age: 58, sex: "unknown" },
    lead: captured ? { name: "Test User", email: "test@example.com" } : null,
    created_at: "2026-04-20T00:00:00Z",
  };
}

async function mockResultsGet(page: Page, captured: boolean) {
  await page.route(RESULTS_API_URL, (route: Route) => {
    if (route.request().method() !== "GET") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildResultsResponse(captured)),
    });
  });
}

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Accessibility — axe-core audit", () => {
  test("home page has no critical or serious violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, formatViolations(critical)).toHaveLength(0);
  });

  test("labs form has no critical or serious violations", async ({ page }) => {
    await page.goto("/labs");
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, formatViolations(critical)).toHaveLength(0);
  });

  test("gate page has no critical or serious violations", async ({ page }) => {
    // captured=false so the gate form renders (not auto-redirected).
    await mockResultsGet(page, false);
    await page.goto(`/gate/${TEST_TOKEN}`);

    // Wait for the gate form to be ready — otherwise axe may scan the
    // loading skeleton only.
    await page.getByTestId("gate-form").waitFor({ state: "visible", timeout: 10_000 });

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, formatViolations(critical)).toHaveLength(0);
  });

  test("results page has no critical or serious violations", async ({ page }) => {
    // captured=true so the results view renders (not redirected to /gate).
    await mockResultsGet(page, true);
    await page.goto(`/results/${TEST_TOKEN}`);

    // Wait for chart to render so axe scans the full tree.
    await page.waitForSelector("svg", { state: "visible", timeout: 10_000 });
    await page.getByTestId("results-heading").waitFor({ state: "visible" });

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      // LKID-80 (2026-04-20): SVG exclusion re-added per Brad's reversal of
      // the chart-line palette to design hues. The yellow trajectory line
      // (#D4A017) fails WCAG AA at 2.38:1 on white — an intentional
      // regression on chart SVG only, in exchange for brand-identity
      // alignment with project/Results.html. Scenario pills, cards, heart
      // icons, and page chrome (nav/buttons/text) remain in scope and AA-
      // compliant via the --s-*-text tokens from PR #57.
      // See agents/inga/drafts/chart-palette-decision.md (top supersession
      // block) for the reversed decision and contrast math.
      // LKID-89 PR #66 review (CodeRabbit Major): scope the waiver to the
      // chart SVG only (was previously `svg`, which excluded every SVG on
      // the page including icons and page chrome — too broad).
      // TODO(LKID-89): re-enable contrast scanning on the chart SVG when
      // the LKID-81 visual-regression suite lands and can verify chart
      // palette via pixel diff. Remove this waiver at that time.
      .exclude('[data-testid="egfr-chart-svg"]')
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, formatViolations(critical)).toHaveLength(0);
  });

  test("auth page has no critical or serious violations", async ({ page }) => {
    await page.goto("/auth");
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, formatViolations(critical)).toHaveLength(0);
  });
});

/** Format violations for readable test output. */
function formatViolations(
  violations: import("axe-core").Result[],
): string {
  if (violations.length === 0) return "No violations";
  return violations
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.description}\n` +
        v.nodes.map((n) => `  - ${n.html.slice(0, 100)}`).join("\n"),
    )
    .join("\n\n");
}
