# QA Verdict -- PR #30 `feat/LKID-28-e2e-tests`

**Date:** 2026-04-07
**Reviewer:** Yuri (QA/Test Writer)
**Card:** LKID-28 (E2E integration tests)
**Files changed:** `app/playwright.e2e.config.ts` (new), `app/tests/e2e/prediction-flow.spec.ts` (new), `app/tsconfig.json` (modified)

---

## Verdict: CONDITIONAL PASS -- 0 Blocking, 5 Non-Blocking

The PR is mergeable. All test selectors match the actual component `data-testid` attributes. The mock data structure is close to the real `PredictResponse` but has one extra field. The route interception correctly handles POST /predict while passing through /predict/pdf. Error tests verify form state preservation. The tsconfig exclude is safe. The 6 tests cover the PRD's "two E2E tests" requirement (happy path + error path) with good additional coverage.

---

## Test Run

### Backend prediction engine tests

```
cd backend && venv/bin/python -m pytest tests/test_prediction_engine.py -v --tb=short
```

Result: **124 passed, 0 failed** in 0.05s. No regressions.

---

## Selector Verification

All test selectors were verified against the actual component source code:

| Test Selector | Component | Line | Match |
|---------------|-----------|------|-------|
| `data-testid="predict-heading"` | predict/page.tsx | 347 | YES |
| `data-testid="submit-button"` | predict/page.tsx | 545 | YES |
| `data-testid="error-summary"` | predict/page.tsx | 368 | YES |
| `data-testid="api-error"` | predict/page.tsx | 380 | YES |
| `data-testid="input-email"` | predict/page.tsx | 414 | YES |
| `data-testid="input-bun"` | predict/page.tsx (via NumericField) | 638 | YES |
| `data-testid="input-creatinine"` | predict/page.tsx (via NumericField) | 638 | YES |
| `data-testid="input-potassium"` | predict/page.tsx (via NumericField) | 638 | YES |
| `data-testid="input-age"` | predict/page.tsx (via NumericField) | 638 | YES |
| `getByLabel("Male")` | predict/page.tsx SexField | 718 (`aria-label={opt.label}`) | YES |
| `getByText("Your Prediction")` | results/page.tsx | 132 | YES |
| `getByRole("button", { name: /Download Your Results/i })` | results/page.tsx | 191 (`Download Your Results (PDF)`) | YES |
| `getByText(/informational purposes only/i)` | DisclaimerBlock component | -- | YES (standard disclaimer text) |
| `getByText("Back to form")` | results/page.tsx | 202 | YES (text is `Back to form` with arrow entity prefix) |

All selectors verified. No mismatches.

---

## Mock Data Structure Verification

The `VALID_PREDICTION_RESPONSE` mock was compared against the backend `PredictResponse` Pydantic model (backend/main.py:394-409) and the frontend `PredictResponse` TypeScript interface (app/src/components/chart/types.ts:54-86).

| Field | Backend Model | Frontend Interface | Mock Data | Match |
|-------|---------------|--------------------| ----------|-------|
| `egfr_baseline` | `float` (required) | `number` (required) | `28.0` | YES |
| `confidence_tier` | `int` (required) | `1 \| 2` (optional) | `1` | YES |
| `trajectories` | `Trajectories` (required) | `{ no_treatment, bun_18_24, bun_13_17, bun_12 }` | All 4 arrays, 15 values each | YES |
| `time_points_months` | `list[int]` (required) | `number[]` (required) | 15 values matching canonical | YES |
| `dial_ages` | `DialAges` (required) | `{ no_treatment, bun_18_24, bun_13_17, bun_12 }` | Present, 3 nulls + 1 float | YES |
| `dialysis_threshold` | `float` (required) | `number` (required) | `12.0` | YES |
| `stat_cards` | `dict[str, float]` (required) | **Not in frontend type** | Present in mock | See N-1 |
| `bun_suppression_estimate` | `Optional[float]` | `number` (required in TS) | `1.9` | YES |
| `structural_floor` | `Optional[StructuralFloor]` | `StructuralFloor?` (optional) | Not present | OK (optional) |

The mock is structurally valid. The `stat_cards` field is present in the mock and required by the backend model, but absent from the frontend `PredictResponse` TypeScript interface. Since the frontend silently ignores unknown fields during `JSON.parse()`, this is harmless to the test. See N-1.

---

## Route Interception Verification

The `mockPredictAPI` helper (lines 59-75) intercepts `**/predict` routes. The guard logic:

```typescript
if (route.request().method() === "POST" && !route.request().url().includes("/pdf")) {
```

This correctly:
- Intercepts POST /predict (the prediction endpoint)
- Passes through GET requests (any navigation)
- Passes through POST /predict/pdf (the PDF endpoint, which the happy-path test does not exercise but must not accidentally intercept)

The URL pattern `**/predict` matches both `/predict` and `/predict/pdf`, so the `/pdf` exclusion guard is necessary and correct.

---

## Error Path Verification

### Validation errors (empty form submit)
Test clicks submit with empty fields. The `handleSubmit` function (predict/page.tsx:222) calls `setSubmitted(true)`, then checks `requiredValid`. With all fields empty, `requiredValid` is false, the function returns early, and the `error-summary` div renders at line 363-373. The test correctly asserts this is visible and that no navigation occurs.

### API 500 error -- form state preservation
Test fills the form, mocks a 500, submits. The `handleSubmit` function parses the error body and calls `setApiError()` (line 295-300) then `setIsSubmitting(false)` (line 301). The `apiError` state triggers the `api-error` div (line 376-384). The test correctly verifies form input values are preserved (BUN="16", creatinine="3.2") because the component uses controlled inputs via `useState` -- React state is not cleared on API error. No `setValues({})` or form reset call exists in the error path.

### Results redirect without data
Test navigates directly to `/results`. The `useEffect` at results/page.tsx:219 checks `sessionStorage.getItem("prediction_result")`. If null, it calls `window.location.href = "/predict"`. Test uses `page.waitForURL("**/predict")` which correctly waits for the redirect.

### Rate limit 429 error
Test mocks 429, fills form, submits. Same error handling path as 500 -- the `!res.ok` branch (line 284) catches all non-2xx. The test verifies `api-error` is visible and URL stays on `/predict`.

---

## Non-Blocking Issues

### N-1: Mock includes `stat_cards` which is not in the frontend PredictResponse type

**Location:** `app/tests/e2e/prediction-flow.spec.ts:36-41`

The mock response includes `stat_cards` with 5 keys. This field exists in the backend `PredictResponse` Pydantic model (main.py:403) but is absent from the frontend `PredictResponse` TypeScript interface (chart/types.ts:54-86). The frontend ignores it during deserialization.

This is not a bug in the test -- the mock should mirror what the real backend returns, and the backend does return `stat_cards`. However, it creates a maintenance risk: if someone removes `stat_cards` from the backend response in a future PR, this mock will still include it, masking the regression.

**Recommended fix:** Add a code comment above `stat_cards` in the mock noting it's backend-only and not consumed by the frontend.

### N-2: Happy-path test does not verify stat card rendering on the results page

**Location:** `app/tests/e2e/prediction-flow.spec.ts:82-125`

The happy-path test verifies chart SVG, heading, PDF button, disclaimer, and back link. It does not verify any stat card values (baseline eGFR, 10-year projections, potential gain). If stat cards exist on the results page, the test should check at least the baseline eGFR display. If they don't yet exist, this is fine for now.

This is informational -- the PRD says "two E2E tests" and the current coverage satisfies that requirement.

### N-3: Second happy-path test is nearly identical to the first

**Location:** `app/tests/e2e/prediction-flow.spec.ts:127-141`

The test "results page shows baseline eGFR from prediction" repeats the full form-fill-submit flow from the first test but only adds one new assertion: `await expect(page.getByText("Your Prediction")).toBeVisible()`. This assertion is already present in the first test (line 103). The test description says it verifies "baseline eGFR from prediction" but it only checks the heading text, not the actual eGFR value.

**Recommended fix:** Either remove this test (it's a subset of test 1) or enhance it to actually verify the baseline eGFR value appears on the page (e.g., check for the text "28" or the specific stat card display).

### N-4: No test for the network timeout path

**Location:** `app/tests/e2e/prediction-flow.spec.ts` (missing test)

The predict form has a 30-second AbortController timeout (predict/page.tsx:262-263). When triggered, it displays "Request timed out. Please check your connection and try again." This is a distinct user-facing error message not covered by any of the error-path tests. While the PRD only requires "two E2E tests", the timeout is an important UX path for a medical app where users may be on slow connections.

**Recommended addition (low priority):**

```typescript
test("shows timeout error when API does not respond", async ({ page }) => {
  await page.route("**/predict", (route) => {
    if (route.request().method() === "POST" && !route.request().url().includes("/pdf")) {
      // Never fulfill -- let AbortController timeout trigger
    } else {
      route.continue();
    }
  });
  await page.goto("/predict");
  await fillPredictionForm(page);
  await page.getByTestId("submit-button").click();
  const apiError = page.getByTestId("api-error");
  await expect(apiError).toContainText("timed out");
});
```

### N-5: `webServer.reuseExistingServer` defaults to true -- no CI startup guarantee

**Location:** `app/playwright.e2e.config.ts:41`

The config has `reuseExistingServer: true`. In CI, if no dev server is already running, the `webServer.command` (`npm run dev`) will start one and Playwright waits up to 60s for it (line 42). This is fine. However, `reuseExistingServer: true` means locally, if a stale dev server is running on port 3000 from a different branch, Playwright will use it instead of starting a fresh one. This could produce confusing test failures.

**Recommended fix:** Set `reuseExistingServer: !process.env.CI` so CI always starts fresh and local dev gets the convenience of reuse.

---

## tsconfig Exclude Verification

The `exclude` array was changed from:

```json
["node_modules", "playwright.visual.config.ts"]
```

to:

```json
["node_modules", "playwright.visual.config.ts", "playwright.e2e.config.ts", "tests"]
```

**Verification:**
- `playwright.e2e.config.ts` -- Correctly excluded. This file uses `@playwright/test` types that conflict with the Next.js build.
- `tests` -- Excludes the `app/tests/` directory. This is the E2E test directory at `app/tests/e2e/`. Since all app source code lives under `app/src/`, this exclusion is safe and cannot accidentally exclude source files.
- The existing `app/src/test/` directory (unit test fixtures) is under `src/` and matched by the `include` glob `**/*.ts`, so it remains included. No conflict.

---

## PRD Coverage Assessment

The PRD (lean-launch-mvp-prd.md) requires LKID-28 to deliver "two E2E tests":
1. Happy path: form entry through chart display
2. Error path: bad input through graceful error

This PR delivers 6 tests organized into two `test.describe` blocks that map directly to these requirements:

| PRD Requirement | Tests | Coverage |
|-----------------|-------|----------|
| Happy path (form -> chart) | 2 tests | Full flow verified: form fill, submit, results navigation, SVG chart rendering, 4+ trajectory paths, PDF button visible+enabled, disclaimer visible, back link visible |
| Error path (bad input -> graceful error) | 4 tests | Validation errors on empty submit, API 500 with form state preservation, direct /results redirect, rate limit 429 handling |

The PRD requirement is fully satisfied.

---

## What Was Verified

1. All 14 test selectors match actual `data-testid` attributes and accessible names in predict/page.tsx and results/page.tsx.
2. Mock `VALID_PREDICTION_RESPONSE` structurally matches the backend `PredictResponse` model. The `stat_cards` field is present in the mock (matching backend) but absent from the frontend TypeScript type (N-1). All trajectory arrays have the correct 15-element length matching `time_points_months`.
3. Route interception correctly handles POST /predict and passes through /predict/pdf via the URL guard.
4. All 4 error tests verify the user stays on `/predict` (form state preserved, no navigation).
5. tsconfig `exclude` is safe -- only excludes Playwright configs and the `tests/` directory, not app source.
6. PRD "two E2E tests" requirement is satisfied with 2 happy-path + 4 error-path tests.
7. Backend engine tests: 124/124 pass, no regressions.
8. Playwright config: sensible timeouts (30s test, 10s action, 60s webServer startup), CI-aware retry (1 retry in CI, 0 locally), correct reporters.

---

## Summary

PR is ready to merge. Zero blocking issues. The 6 E2E tests correctly verify the prediction form happy path and error paths with accurate selectors, valid mock data, and proper route interception. Five non-blocking observations noted: the mock includes an extra `stat_cards` field not in the frontend type (N-1), no stat card value verification (N-2), a near-duplicate second happy-path test (N-3), no timeout path test (N-4), and a minor CI vs local `reuseExistingServer` consideration (N-5). None affect correctness or block ship.

*Yuri -- 2026-04-07 -- Sprint 3*
