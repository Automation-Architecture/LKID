import { test, expect, Page, Route } from "@playwright/test";

/**
 * E2E Integration Tests — LKID-65
 *
 * Two-step tokenized flow per LKID-63:
 *   1. /labs — fill required lab values, POST /predict → report_token
 *   2. /gate/[token] — fill name + email, POST /leads → mark captured
 *   3. /results/[token] — render chart + stat cards + PDF link
 *
 * Tests intercept /predict, GET /results/[token], POST /leads, and the PDF
 * endpoint so they run without a live backend. The prediction shape matches
 * Lee's golden vector V1 (BUN=16, eGFR=28).
 */

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const TEST_TOKEN = "test-token-abc123";

const VALID_PREDICTION_RESULT = {
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

const VALID_PREDICTION_RESPONSE = {
  report_token: TEST_TOKEN,
  ...VALID_PREDICTION_RESULT,
};

const VALID_INPUTS = {
  bun: 16,
  creatinine: 3.2,
  potassium: 4.5,
  age: 58,
  sex: "unknown",
};

function buildResultsResponse(captured: boolean) {
  return {
    report_token: TEST_TOKEN,
    captured,
    result: VALID_PREDICTION_RESULT,
    inputs: VALID_INPUTS,
    lead: captured
      ? { name: "Test User", email: "test@example.com" }
      : null,
    created_at: "2026-04-20T00:00:00Z",
  };
}

const VALID_LEADS_RESPONSE = {
  ok: true,
  captured: true,
  token: TEST_TOKEN,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillLabsForm(page: Page) {
  await page.getByTestId("labs-input-bun").fill("16");
  await page.getByTestId("labs-input-creatinine").fill("3.2");
  await page.getByTestId("labs-input-potassium").fill("4.5");
  await page.getByTestId("labs-input-age").fill("58");
}

async function fillGateForm(page: Page) {
  await page.getByTestId("gate-input-name").fill("Test User");
  await page.getByTestId("gate-input-email").fill("test@example.com");
}

async function mockPredict(
  page: Page,
  response: Record<string, unknown> = VALID_PREDICTION_RESPONSE,
  status = 200,
) {
  await page.route("**/predict", (route: Route) => {
    if (route.request().method() !== "POST") {
      return route.continue();
    }
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(status === 200 ? response : { error: response }),
    });
  });
}

async function mockResultsGet(
  page: Page,
  captured: boolean,
  status = 200,
) {
  await page.route(`**/results/${TEST_TOKEN}`, (route: Route) => {
    if (route.request().method() !== "GET") {
      return route.continue();
    }
    if (status !== 200) {
      return route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildResultsResponse(captured)),
    });
  });
}

async function mockPdf(page: Page) {
  await page.route(`**/reports/${TEST_TOKEN}/pdf`, (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: Buffer.from("%PDF-1.4\n%stub\n%%EOF", "utf-8"),
    });
  });
}

/**
 * Stateful GET /results mock for the happy-path two-step flow.
 * Starts with captured=false (so /gate renders the form), and flips to
 * captured=true after POST /leads succeeds. Returns helpers to drive state.
 */
function setupStatefulResultsMocks(page: Page) {
  let captured = false;

  page.route(`**/results/${TEST_TOKEN}`, (route: Route) => {
    if (route.request().method() !== "GET") {
      return route.continue();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildResultsResponse(captured)),
    });
  });

  page.route("**/leads", (route: Route) => {
    if (route.request().method() !== "POST") {
      return route.continue();
    }
    captured = true;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(VALID_LEADS_RESPONSE),
    });
  });
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

test.describe("Happy path — labs → gate → results", () => {
  test("completes the full two-step tokenized flow", async ({ page }) => {
    // Mock the three endpoints used across the flow.
    await mockPredict(page);
    setupStatefulResultsMocks(page);
    await mockPdf(page);

    // 1. Navigate to /labs and fill required fields.
    await page.goto("/labs");
    await expect(page.getByTestId("labs-form")).toBeVisible();
    await fillLabsForm(page);

    // 2. Submit labs → backend returns report_token → navigate to /gate/[token].
    await page.getByTestId("labs-submit").click();
    await page.waitForURL(`**/gate/${TEST_TOKEN}`, { timeout: 10_000 });

    // 3. Gate form should render (captured=false, so not auto-redirected).
    await expect(page.getByTestId("gate-form")).toBeVisible();
    await fillGateForm(page);

    // 4. Submit lead capture → navigate to /results/[token].
    await page.getByTestId("gate-submit").click();
    await page.waitForURL(`**/results/${TEST_TOKEN}`, { timeout: 10_000 });

    // 5. Chart renders (SVG present).
    await page.waitForSelector("svg", { state: "visible", timeout: 10_000 });
    await expect(page.getByTestId("results-heading")).toBeVisible();

    // 6. Four trajectory lines exist.
    const paths = page.locator("svg path");
    expect(await paths.count()).toBeGreaterThanOrEqual(4);

    // 7. PDF link is an anchor pointing to /reports/[token]/pdf.
    const pdfLink = page.getByTestId("results-pdf-link");
    await expect(pdfLink).toBeVisible();
    await expect(pdfLink).toHaveAttribute(
      "href",
      expect.stringContaining(`/reports/${TEST_TOKEN}/pdf`),
    );

    // 8. Disclaimer should be present.
    await expect(
      page.getByText(/informational purposes only/i),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Error paths
// ---------------------------------------------------------------------------

test.describe("Error paths", () => {
  test("labs form shows validation errors on empty submit and does not navigate", async ({ page }) => {
    await page.goto("/labs");
    await expect(page.getByTestId("labs-form")).toBeVisible();

    // Submit without filling anything.
    await page.getByTestId("labs-submit").click();

    // Each required field should surface an inline error.
    await expect(page.getByTestId("labs-error-bun")).toBeVisible();
    await expect(page.getByTestId("labs-error-creatinine")).toBeVisible();
    await expect(page.getByTestId("labs-error-potassium")).toBeVisible();
    await expect(page.getByTestId("labs-error-age")).toBeVisible();

    // No navigation occurred.
    expect(page.url()).toContain("/labs");
  });

  test("labs form surfaces a graceful error when /predict returns 500", async ({ page }) => {
    await mockPredict(
      page,
      {
        code: "INTERNAL_ERROR",
        message: "Something went wrong on our end.",
        details: [],
      },
      500,
    );

    await page.goto("/labs");
    await fillLabsForm(page);
    await page.getByTestId("labs-submit").click();

    // Error banner renders; no navigation.
    await expect(page.getByTestId("labs-api-error")).toBeVisible();
    expect(page.url()).toContain("/labs");

    // Form values are preserved (user can retry without re-entering).
    await expect(page.getByTestId("labs-input-bun")).toHaveValue("16");
    await expect(page.getByTestId("labs-input-creatinine")).toHaveValue("3.2");
  });
});

// ---------------------------------------------------------------------------
// Routing guards — captured vs. not-captured
// ---------------------------------------------------------------------------

test.describe("Token routing guards", () => {
  test("gate page auto-redirects to /results when already captured", async ({ page }) => {
    await mockResultsGet(page, /* captured */ true);

    await page.goto(`/gate/${TEST_TOKEN}`);
    // If captured, the gate page replaces the URL with /results/[token].
    await page.waitForURL(`**/results/${TEST_TOKEN}`, { timeout: 10_000 });
  });

  test("results page auto-redirects to /gate when not yet captured", async ({ page }) => {
    await mockResultsGet(page, /* captured */ false);

    await page.goto(`/results/${TEST_TOKEN}`);
    // Without capture, the results page sends the user back to the gate.
    await page.waitForURL(`**/gate/${TEST_TOKEN}`, { timeout: 10_000 });
  });

  test("results page shows invalid-token UI when backend returns 404", async ({ page }) => {
    await mockResultsGet(page, /* captured */ false, 404);

    await page.goto(`/results/${TEST_TOKEN}`);

    await expect(
      page.getByText(/invalid or has expired/i),
    ).toBeVisible();
  });
});
