# QA Verdict — PR #31 `feat/LKID-26-axe-core-audit`

**Date:** 2026-04-07
**Reviewer:** Yuri (QA/Test Writer)
**Card:** LKID-26
**Files changed:** `app/tests/a11y/accessibility.spec.ts` (new), `app/playwright.a11y.config.ts` (new), `app/tsconfig.json`, `app/package.json`, `app/package-lock.json`
**Commits:** 1

## Verdict: PASS (conditional)

One finding requires follow-up but is non-blocking for merge.

---

## What was reviewed

### 1. WCAG 2.1 AA tag coverage

All four tests call `.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])`. This covers:

- **wcag2a** — WCAG 2.0 Level A
- **wcag2aa** — WCAG 2.0 Level AA
- **wcag21a** — WCAG 2.1 Level A
- **wcag21aa** — WCAG 2.1 Level AA

This is the correct and complete set for a WCAG 2.1 AA conformance audit. **Pass.**

### 2. Severity filtering (critical/serious only)

Each test filters violations with `v.impact === "critical" || v.impact === "serious"`. Moderate and minor violations are allowed through, which is correct for a CI gate — moderate/minor issues should be tracked and fixed iteratively but should not block deployment. The target demographic (60+ CKD patients) makes this a sensible baseline that avoids false-positive flakiness while still catching the violations that materially block access. **Pass.**

### 3. Results page form submission flow

The results page test (lines 64-103) follows the correct flow:

1. Mocks `**/predict` POST route to return `MOCK_PREDICTION` (line 68-78)
2. Navigates to `/predict`, fills all required fields via `getByTestId` selectors (lines 82-88)
3. Submits, waits for navigation to `/results` (line 89)
4. Waits for SVG to render (line 90)
5. Runs axe-core scan

**Selector verification:** The form uses `data-testid={`input-${field.id}`}` with field IDs `bun`, `creatinine`, `potassium`, `age` — all in `REQUIRED_FIELDS` (always visible, not behind tier2 toggle). `input-email` has an explicit `data-testid`. Sex radio uses `getByLabel("Male")` matching the radio label. All selectors confirmed present in `predict/page.tsx`.

**Route mock logic:** The intercept checks `method() === "POST" && !url().includes("/pdf")`, so page navigation GETs pass through and PDF routes are unaffected. The mock response structure matches the E2E test's `VALID_PREDICTION_RESPONSE` and the `PredictResponse` schema.

**sessionStorage population:** The form handler stores `prediction_result` in sessionStorage on successful API response (line 306 of predict/page.tsx), then navigates to `/results`. The results page reads from sessionStorage. This flow is correctly exercised.

**Clerk getToken() in test:** `useAuth().getToken()` returns null when no Clerk session exists. The form guards with `if (token)` before setting the Authorization header (line 271). The route mock intercepts regardless of auth headers. No issue. **Pass.**

### 4. SVG exclusion justification

The results page test uses `.exclude("svg")` (line 96). Justification:

- Visx generates complex SVG with many internal `<path>`, `<rect>`, `<line>`, `<text>` elements that axe-core flags for missing ARIA roles
- The chart's wrapper `<svg>` element has `aria-label="eGFR trajectory chart showing 4 predicted kidney function scenarios over 10 years"` (EgfrChart.tsx:308)
- The chart section has `aria-label="Your kidney health prediction"` (results/page.tsx:141)
- The chart includes an accessible data table fallback (`aria-label="eGFR trajectory data table"`, EgfrChart.tsx:630)
- A trajectory legend with individual `aria-label` attributes per scenario (EgfrChart.tsx:685)

The SVG internals are genuinely outside the app's control (third-party Visx rendering). The surrounding accessibility structure is comprehensive. **Pass.**

### 5. formatViolations helper

The helper (lines 119-130) produces output in this format:

```
[critical] color-contrast: Ensures the contrast between foreground and background...
  - <button class="btn">Submit</button>
```

It includes: impact level, rule ID, description, and the offending HTML node (truncated to 100 chars). This is actionable — a developer can identify the exact element and the specific WCAG rule that failed. **Pass.**

### 6. Page coverage audit

**Covered pages (4):**
- `/` (home)
- `/predict` (form)
- `/results` (chart + stat cards)
- `/auth` (sign-in)

**Not covered (2):**
- `/client/[slug]` — Lee's client dashboard. Slug-gated (`VALID_SLUGS = ["lee-a3f8b2"]`). This is an internal stakeholder page, not patient-facing. Omission is acceptable.
- `/internal/chart` — Playwright PDF rendering endpoint. Protected by shared secret query parameter. Not user-facing. Omission is correct.

All user-facing pages are covered. **Pass.**

### 7. Playwright config review

- `testDir: "./tests/a11y"` — correctly isolated from E2E and visual tests
- `outputDir: "./tests/a11y/test-results"` — separate output directory, good
- CI retries: 1 (sensible for flakiness), local: 0 (fast feedback)
- Timeout: 30s global, 10s action, 30s navigation — generous enough for SSR + hydration
- Single project: Chromium only. This is acceptable for axe-core (a11y rules are browser-agnostic; DOM structure is the same across engines)
- `webServer` configured with `reuseExistingServer: true` — won't spawn duplicate dev servers
- `baseURL` reads from `BASE_URL` env var with localhost:3000 fallback — CI-friendly

**Pass.**

### 8. tsconfig.json exclusion

`playwright.a11y.config.ts` added to the `exclude` array alongside existing `playwright.visual.config.ts` and `playwright.e2e.config.ts`. This prevents Next.js from attempting to compile the Playwright config as application code. Consistent with existing pattern. **Pass.**

### 9. Dependency addition

`@axe-core/playwright: ^4.11.1` added to `devDependencies`. Correct scope (dev only, not shipped to production). Version is current. **Pass.**

---

## Finding: MOCK_PREDICTION duplicated across test files (non-blocking)

The `MOCK_PREDICTION` constant in the a11y test is a near-exact copy of `VALID_PREDICTION_RESPONSE` in `app/tests/e2e/prediction-flow.spec.ts`. If the response schema changes, both files must be updated in lockstep.

**Recommendation:** Extract the shared mock to a test fixture file (e.g., `app/tests/fixtures/mock-prediction.ts`) and import in both specs. This is a maintenance improvement, not a merge blocker.

---

## Summary

| Check | Result |
|-------|--------|
| WCAG 2.1 AA tags | Pass |
| Severity filtering | Pass |
| Results page flow | Pass |
| SVG exclusion | Pass (justified) |
| formatViolations output | Pass |
| Page coverage | Pass (all user-facing) |
| Playwright config | Pass |
| tsconfig exclusion | Pass |
| Dependency | Pass |

**Verdict: PASS** — Ready to merge. One non-blocking recommendation to extract the shared mock prediction fixture.
