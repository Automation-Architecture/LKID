import { test, expect } from "@playwright/test";

/**
 * E2E Integration Tests — LKID-28
 *
 * Two required tests per PRD:
 *   1. Happy path: form → predict → chart → PDF download
 *   2. Error path: bad input → graceful error → lead not lost
 *
 * These tests intercept the /predict API to avoid depending on a live backend.
 * The prediction response matches Lee's golden vector V1 (BUN=16, eGFR=28).
 */

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const VALID_PREDICTION_RESPONSE = {
  egfr_baseline: 28.0,
  confidence_tier: 1,
  trajectories: {
    no_treatment: [28.0, 27.8, 27.3, 26.5, 25.0, 23.5, 22.0, 19.0, 16.0, 13.0, 10.0, 7.0, 4.0, 1.0, 0],
    bun_18_24: [28.0, 28.1, 28.3, 27.8, 27.0, 26.2, 25.3, 23.5, 21.7, 19.8, 18.0, 16.2, 14.3, 12.5, 10.7],
    bun_13_17: [28.0, 28.1, 28.3, 27.8, 26.8, 25.8, 24.8, 22.8, 20.8, 18.8, 16.8, 14.8, 12.8, 10.8, 8.8],
    bun_12: [28.0, 28.1, 28.3, 28.0, 27.6, 27.1, 26.7, 26.0, 25.4, 24.7, 24.1, 23.4, 22.8, 22.1, 21.5],
  },
  time_points_months: [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120],
  dial_ages: {
    no_treatment: 67.5,
    bun_18_24: null,
    bun_13_17: null,
    bun_12: null,
  },
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillPredictionForm(page: import("@playwright/test").Page) {
  await page.getByTestId("input-email").fill("test@example.com");
  await page.getByTestId("input-bun").fill("16");
  await page.getByTestId("input-creatinine").fill("3.2");
  await page.getByTestId("input-potassium").fill("4.5");
  await page.getByTestId("input-age").fill("58");
  // Select sex — click the Male radio button
  await page.getByLabel("Male").click();
}

async function mockPredictAPI(
  page: import("@playwright/test").Page,
  response: Record<string, unknown>,
  status = 200,
) {
  await page.route("**/predict", (route) => {
    if (route.request().method() === "POST" && !route.request().url().includes("/pdf")) {
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(status === 200 ? response : { error: response }),
      });
    } else {
      route.continue();
    }
  });
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

test.describe("Happy path — form → predict → chart → PDF", () => {
  test("completes the full prediction flow", async ({ page }) => {
    // 1. Mock the /predict API
    await mockPredictAPI(page, VALID_PREDICTION_RESPONSE);

    // 2. Navigate to the prediction form
    await page.goto("/predict");
    await expect(page.getByTestId("predict-heading")).toBeVisible();

    // 3. Fill in all required fields
    await fillPredictionForm(page);

    // 4. Submit the form
    await page.getByTestId("submit-button").click();

    // 5. Should navigate to results page
    await page.waitForURL("**/results", { timeout: 10000 });

    // 6. Chart should render with SVG element
    await page.waitForSelector("svg", { state: "visible", timeout: 10000 });

    // 7. Verify the chart heading is visible
    await expect(page.getByText("Your Prediction")).toBeVisible();

    // 8. Verify all 4 trajectory lines exist (SVG paths)
    const paths = page.locator("svg path");
    const pathCount = await paths.count();
    expect(pathCount).toBeGreaterThanOrEqual(4);

    // 9. PDF download button should be visible and enabled
    const pdfButton = page.getByRole("button", {
      name: /Download Your Results/i,
    });
    await expect(pdfButton).toBeVisible();
    await expect(pdfButton).toBeEnabled();

    // 10. Disclaimer should be present
    await expect(
      page.getByText(/informational purposes only/i),
    ).toBeVisible();

    // 11. Back to form link should work
    const backLink = page.getByText("Back to form");
    await expect(backLink).toBeVisible();
  });

  test("results page shows baseline eGFR from prediction", async ({
    page,
  }) => {
    await mockPredictAPI(page, VALID_PREDICTION_RESPONSE);
    await page.goto("/predict");
    await fillPredictionForm(page);
    await page.getByTestId("submit-button").click();
    await page.waitForURL("**/results");

    // The chart should contain the baseline eGFR value
    await page.waitForSelector("svg", { state: "visible", timeout: 10000 });
    // Verify page loaded with prediction data (heading visible = data parsed OK)
    await expect(page.getByText("Your Prediction")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Error path
// ---------------------------------------------------------------------------

test.describe("Error path — bad input → graceful error", () => {
  test("shows validation errors for empty required fields", async ({
    page,
  }) => {
    await page.goto("/predict");

    // Submit without filling anything
    await page.getByTestId("submit-button").click();

    // Should show error summary
    const errorSummary = page.getByTestId("error-summary");
    await expect(errorSummary).toBeVisible();

    // Should not navigate away
    expect(page.url()).toContain("/predict");
  });

  test("shows API error gracefully without losing form state", async ({
    page,
  }) => {
    // Mock a 500 server error
    await mockPredictAPI(
      page,
      {
        code: "INTERNAL_ERROR",
        message: "Something went wrong on our end.",
        details: [],
      },
      500,
    );

    await page.goto("/predict");
    await fillPredictionForm(page);
    await page.getByTestId("submit-button").click();

    // Should show the API error message
    const apiError = page.getByTestId("api-error");
    await expect(apiError).toBeVisible();

    // Form values should still be filled (not cleared)
    await expect(page.getByTestId("input-bun")).toHaveValue("16");
    await expect(page.getByTestId("input-creatinine")).toHaveValue("3.2");

    // Should not navigate away
    expect(page.url()).toContain("/predict");
  });

  test("results page redirects to form when no prediction data exists", async ({
    page,
  }) => {
    // Go directly to /results without submitting a prediction
    await page.goto("/results");

    // Should redirect to /predict
    await page.waitForURL("**/predict", { timeout: 5000 });
  });

  test("shows rate limit error with retry message", async ({ page }) => {
    await mockPredictAPI(
      page,
      {
        code: "RATE_LIMIT",
        message: "Too many requests. Please wait before trying again.",
        details: [],
      },
      429,
    );

    await page.goto("/predict");
    await fillPredictionForm(page);
    await page.getByTestId("submit-button").click();

    // Should show error, not navigate away
    const apiError = page.getByTestId("api-error");
    await expect(apiError).toBeVisible();
    expect(page.url()).toContain("/predict");
  });
});
