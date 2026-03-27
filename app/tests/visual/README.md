# Visual Regression Tests

Playwright-based visual regression tests for the KidneyHood Visx eGFR trajectory chart.

## Prerequisites

- Node.js 18+
- Playwright browsers installed:
  ```bash
  npx playwright install --with-deps chromium firefox webkit
  ```

## Running Tests

```bash
# Run all visual regression tests (all browsers)
npx playwright test --config=playwright.visual.config.ts

# Run specific browser only
npx playwright test --config=playwright.visual.config.ts --project=chromium-visual

# Run with UI mode for debugging
npx playwright test --config=playwright.visual.config.ts --ui
```

## Updating Baselines

When the chart design intentionally changes, update the baseline snapshots:

```bash
npx playwright test --config=playwright.visual.config.ts --update-snapshots
```

Review the updated snapshots in `tests/visual/snapshots/` before committing.

## Test Cases

| Test | Scenario | What it validates |
|------|----------|-------------------|
| Single visit | Stage 3b patient, 4 trajectories | All trajectory lines render, correct divergence from baseline |
| Multi-visit | 3+ visits, Tier 2 confidence | Additional data points render correctly, confidence indicator |
| Dialysis threshold | Stage 4, no-treatment crosses eGFR 12 | Threshold line visible, crossing point rendered correctly |
| Mobile viewport | 375x667 responsive | Chart scales properly, labels remain readable |

## Pixel Diff Threshold

The default threshold is **1% of total pixels** (`maxDiffPixelRatio: 0.01`).

**Rationale:** SVG rendering has minor anti-aliasing differences across browser engines. WebKit in particular renders fonts and curve anti-aliasing differently from Chromium. 1% accommodates these sub-pixel variations while catching:

- Missing trajectory lines
- Wrong axis labels or scales
- Broken layout or overlapping elements
- Color changes in trajectory lines
- Missing or misplaced dialysis threshold line

If a specific browser consistently fails at 1%, increase per-test:
```typescript
await expect(page).toHaveScreenshot("name.png", {
  maxDiffPixelRatio: 0.015,  // e.g., WebKit needs 1.5%
});
```

## Directory Structure

```
tests/visual/
├── chart-regression.spec.ts    # Test file with all visual regression cases
├── snapshots/                  # Baseline screenshots (auto-generated)
│   ├── chart-regression.spec.ts/
│   │   ├── chart-single-visit-chromium-visual.png
│   │   ├── chart-single-visit-firefox-visual.png
│   │   ├── chart-single-visit-webkit-visual.png
│   │   └── ...
├── test-results/               # Diff output on failure (gitignored)
└── README.md                   # This file
```

## Deterministic Rendering

Tests use Playwright route interception to inject mock prediction API responses. This ensures:

1. Charts always render the same data regardless of backend state
2. No flaky tests from network latency or API changes
3. Each test scenario exercises a specific visual state

The `waitForChartStable()` helper waits for the SVG to fully render before capturing. If Harshit adds entrance animations to the chart, the wait timing should be adjusted accordingly.

## CI Integration

In CI, visual regression tests run with `retries: 0` (fail immediately) and produce GitHub Actions annotations plus an HTML report. Locally, one retry is allowed for investigating flaky rendering.
