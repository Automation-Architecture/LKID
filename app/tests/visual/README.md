# Visual Regression Tests — eGFR Chart (LKID-81)

Playwright-based visual regression suite that snapshots the Visx eGFR
trajectory chart and fails CI if the rendered SVG drifts from the committed
baseline.

This is a safety net for the chart only. It does not cover the rest of the
Results page, the Lab Form, or the Email Gate.

## Layout

```text
app/tests/visual/
├── README.md                          (this file)
├── chart-regression.spec.ts           (the spec — Stage 3a + Stage 4 scenarios)
├── snapshots/
│   └── chart-regression.spec.ts-snapshots/
│       ├── chart-stage-3a-baseline.png
│       └── chart-stage-4-baseline.png
└── test-results/                      (gitignored — diffs from failed runs)
```

The corresponding Playwright config is `app/playwright.visual.config.ts`.
The corresponding CI workflow is `.github/workflows/visual-regression.yml`.

## How it works

1. The Results page (`app/src/app/results/[token]/page.tsx`) is a
   `"use client"` component that fetches `GET ${NEXT_PUBLIC_API_URL}/results/{token}`
   from the browser in a `useEffect`.
2. The spec uses `page.route` to intercept that fetch and serve a deterministic
   prediction payload (Stage 3a or Stage 4 baseline).
3. The chart renders, fonts load, animations are killed, and Playwright
   captures a screenshot of the `[data-testid="egfr-chart-svg"]` element.
4. On CI, the screenshot is compared against the committed baseline. A diff
   beyond the configured 0.1% pixel-ratio threshold fails the run.

No backend, database, or live network is required — everything is mocked at
the browser-network layer.

### Why `NEXT_PUBLIC_API_URL` is set in `playwright.visual.config.ts`

The repo's CSP (`next.config.ts`) reads `NEXT_PUBLIC_API_URL` at build time
and emits its origin into the `connect-src` directive. If we don't set it
explicitly, `apiUrl()` resolves to the default `http://localhost:8000`, which
is **not** in the CSP allowlist — Chromium blocks the fetch before
`page.route` ever sees it. The webServer config sets
`NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`, which is then trusted by both
the CSP header and the route mock matcher.

## Running locally

```bash
cd app

# Run the suite (asserts current code matches committed baselines)
npm run test:visual

# Regenerate baselines (only after an intentional design change)
npm run test:visual:update
```

The first run automatically starts `next dev` on `:3000` if no server is
already listening; subsequent runs reuse the existing one.

If you don't have Chromium installed locally yet:

```bash
cd app
npx playwright install chromium
```

## Regenerating baselines

**When to do it:**

- Intentional chart redesign (new palette, new annotation, layout shift)
- Library bump that changes Visx rendering output
- Font/typography migration

**When NOT to do it:**

- A test failed and you don't yet understand why. Open the diff PNG first
  (downloaded from the GitHub Actions artifact, or in
  `tests/visual/test-results/`) and reason about what changed before
  burying it under a fresh snapshot. Regenerating baselines without
  understanding the diff is how visual regressions ship.

**How:**

```bash
cd app
npm run test:visual:update
```

Then review the updated PNGs in `tests/visual/snapshots/.../*.png`,
visually confirm they look right, and commit them along with the code
change that caused the diff. The commit message should explain *why* the
chart changed (link the LKID card).

## Reading a CI failure

When the workflow fails, the GitHub Actions run uploads a
`visual-regression-diffs` artifact. Download it. Inside you'll find one
folder per failed test, each with:

- `*-expected.png` — the committed baseline
- `*-actual.png` — what the current code produced
- `*-diff.png` — pixels that differ, highlighted in red

In a normal regression the diff PNG points exactly at what changed (a line
that moved, a color that shifted, a label that disappeared). If the diff is
correct, fix the code. If the diff IS the intentional change, regenerate
the baseline locally per "Regenerating baselines" above.

## Threshold

`maxDiffPixelRatio: 0.001` (0.1% of pixels) per LKID-81 acceptance criteria.

Tight enough that any real chart change shows up as a failure; loose enough
that sub-pixel anti-aliasing variation between identical runs doesn't false-
positive. If real flake appears (same code, same OS, repeated runs differ
by > 0.1%) raise the threshold incrementally and document why.

## Cross-platform baselines

The Playwright config uses `snapshotPathTemplate` to drop the `{platform}`
token from baseline filenames — a single PNG serves macOS, Linux, and CI.
Chromium's font rendering on Manrope/Nunito Sans is consistent enough at
the 0.1% threshold for this to work, **as long as baselines are generated
on Linux** (the CI runner OS) so they match what production CI sees.

If you change the chart, run the `Visual regression / update-baselines`
workflow_dispatch job to regenerate the Linux baselines on a CI runner and
auto-commit them to your branch. Local regeneration on macOS will work for
local iteration but the resulting PNG may diff against CI on the first run
— that's a hint to dispatch the workflow rather than committing the
macOS-flavored PNG directly.

## Scope

Two scenarios cover the chart's structural surface:

| Scenario | Baseline | What it validates |
|----------|----------|-------------------|
| Stage 3a | eGFR 50 | Four trajectories, end-of-line callouts, no threshold-crossing |
| Stage 4  | eGFR 18 | Four trajectories, no-treatment crosses dialysis threshold, threshold band visible, callouts at 0 and the best-case value |

Adding more scenarios is cheap — drop another entry into `SCENARIOS` in the
spec, run `npm run test:visual:update`, commit. Avoid over-fragmenting:
each scenario adds CI time and another PNG to maintain.

## References

- Card: [LKID-81](https://automationarchitecture.atlassian.net/browse/LKID-81)
- Block memo (predecessor): `agents/harshit/drafts/lkid-80-snapshot-refresh-blocked.md`
- Yuri's QA observation: `agents/yuri/drafts/sprint5-pr59-qa-verdict.md` nit #1
- Tokenized-flow precedent: `app/tests/e2e/prediction-flow.spec.ts`
- Chart component: `app/src/components/chart/EgfrChart.tsx` (DO NOT EDIT in test PRs)
