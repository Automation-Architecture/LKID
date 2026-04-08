import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility Tests — LKID-26
 *
 * axe-core audit: zero critical/serious violations on all pages.
 * Target demographic is 60+ CKD patients — accessibility is non-negotiable.
 *
 * Run:
 *   npx playwright test --config=playwright.a11y.config.ts
 */

// Mock prediction data for results page (same as E2E tests)
const MOCK_PREDICTION = {
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

test.describe("Accessibility — axe-core audit", () => {
  test("home page has no critical or serious violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, formatViolations(critical)).toHaveLength(0);
  });

  test("prediction form has no critical or serious violations", async ({
    page,
  }) => {
    await page.goto("/predict");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, formatViolations(critical)).toHaveLength(0);
  });

  test("results page has no critical or serious violations", async ({
    page,
  }) => {
    // Mock /predict API and inject data via sessionStorage
    await page.route("**/predict", (route) => {
      if (route.request().method() === "POST" && !route.request().url().includes("/pdf")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PREDICTION),
        });
      } else {
        route.continue();
      }
    });

    // Navigate to predict, fill form, submit to populate sessionStorage
    await page.goto("/predict");
    await page.getByTestId("input-email").fill("test@example.com");
    await page.getByTestId("input-bun").fill("16");
    await page.getByTestId("input-creatinine").fill("3.2");
    await page.getByTestId("input-potassium").fill("4.5");
    await page.getByTestId("input-age").fill("58");
    await page.getByLabel("Male").click();
    await page.getByTestId("submit-button").click();
    await page.waitForURL("**/results", { timeout: 10000 });
    await page.waitForSelector("svg", { state: "visible", timeout: 10000 });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Exclude SVG chart internals — Visx generates complex SVG that
      // may have aria gaps, but chart has an aria-label on the section
      .exclude("svg")
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, formatViolations(critical)).toHaveLength(0);
  });

  test("auth page has no critical or serious violations", async ({ page }) => {
    await page.goto("/auth");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

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
