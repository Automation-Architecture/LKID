# LKID-92 PR #78 QA Verdict — Post-LKID-91 Cleanup

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**Branch:** `chore/LKID-92-post-lkid-91-cleanup`
**PR:** [#78](https://github.com/Automation-Architecture/LKID/pull/78)
**Card:** LKID-92
**Scope:** Bundled cleanup — (1) remove `TODO(LKID-89)` axe waiver on chart SVG; (2) delete dormant `combineMidScenarios` helper + `bun_13_24` config entry.

---

## Top-Level Verdict: **PASS WITH NITS**

PR is structurally correct, type-safe, lint-clean, and CI-green on the canonical workflow (visual-regression Linux run). The waiver removal is logically sound — LKID-91 hides the AA-failing yellow `bun_18_24` trajectory before render, so the chart's remaining strokes (navy 13.26:1 AAA, gray 5.08:1 AA) all pass contrast. Dormant code deletion is verifiably orphaned: zero references in `app/src`, `app/tests`, or `backend/`. **One non-blocking gap:** the only axe test that scans the chart SVG (`results page`) times out before reaching axe — this is a pre-existing local-env defect that also fails on `main` (verified by checkout + re-run), so the waiver removal is not _empirically_ verified end-to-end. Documented as Risk #1 below; recommend filing a follow-up to fix the local-env test path so the chart-SVG axe scan gains real coverage.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Acceptance criteria | 11 | 11 | 0 | 0 |
| Type / lint | 2 | 2 | 0 | 0 |
| CI | 2 | 1 | 0 | 1 (no axe CI workflow) |
| Axe SVG scan verification | 1 | 0 | 0 | 1 (env-blocked, pre-existing) |
| **Totals** | **16** | **14** | **0** | **2** |

---

## AC Checklist

| # | AC | Verdict | Evidence |
|---|----|---------|----------|
| 1 | `.exclude('[data-testid="egfr-chart-svg"]')` removed from `accessibility.spec.ts` | PASS | Line 118: `await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();` — no `.exclude()` call. `grep -n "exclude" app/tests/a11y/accessibility.spec.ts` → empty. |
| 2 | `TODO(LKID-89)` comment block removed | PASS | Lines 116-122 of old spec gone; only the analyze() call remains. |
| 3 | Binding-policy doc comment in `transform.ts` updated | PASS | Lines 18-27: rewritten to "Axe contrast checks now run against the chart SVG. Visual regression (LKID-81) catches palette drift; LKID-91 removed the AA-failing yellow trajectory…". Accurately reflects post-LKID-91 state. |
| 4 | `combineMidScenarios` helper deleted from `transform.ts` | PASS | Diff shows -56 lines including the `export function combineMidScenarios(data: ChartData): ChartData {…}` block. Function no longer present in file. |
| 5 | `bun_13_24` entry deleted from `TRAJECTORY_CONFIG` | PASS | Diff -11 lines for the `bun_13_24:` config block. `TRAJECTORY_CONFIG` now contains exactly 4 entries (lte_12, 13_17, 18_24, no_treatment). |
| 6 | `bun_13_24` removed from `TrajectoryId` union in `types.ts` | PASS | `types.ts:9-13` — union now lists only `bun_lte_12 | bun_13_17 | bun_18_24 | no_treatment`. |
| 7 | `combineMidScenarios` re-export removed from `index.ts` | PASS | `index.ts:2-7` — re-export list no longer includes `combineMidScenarios`. |
| 8 | Stale `bun_13_24` reference in `EgfrChart.tsx` cleaned | PASS | Comment at lines 737-742 now references only `bun_13_17`; the prior "/bun_13_24" alternative removed. |
| 9 | `grep -rn "combineMidScenarios\|bun_13_24" app/src app/tests` → zero hits | PASS | Verified — empty result. Also clean in `backend/`. |
| 10 | `tsc --noEmit` clean | PASS | `cd app && npx tsc --noEmit` → exit 0, no diagnostics. Confirms no lurking consumers of the deleted public types/exports. |
| 11 | `eslint src/components/chart src/components/results tests/a11y` clean | PASS | Exit 0. |

---

## Axe Chart-SVG Scan Verification

**The "results page" test (line 109 of `accessibility.spec.ts`) is the ONE test that exercises the chart SVG**, because:
- It mocks `GET /results/{token}` (line 111: `mockResultsGet(page, true)`).
- It navigates to `/results/${TEST_TOKEN}` and waits for `svg` + `results-heading` (lines 112-116).
- It runs `AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()` over the entire DOM tree, which now includes `<svg data-testid="egfr-chart-svg">` since the `.exclude()` is gone.

**Local result on PR branch:** FAIL (TimeoutError on `page.getByTestId("results-heading").waitFor`, 10s timeout). The route mock fulfills the API call but the page never renders `results-heading` within 10s. `<svg>` is detected (the prior `waitForSelector("svg")` step passes), so the page is partially hydrated.

**Local result on `main`:** Same TimeoutError, same line. **Pre-existing defect, not introduced by this PR.** The waiver-removal change is upstream of the failure — even if the test passed, the diff in axe behaviour would only be: (a) waiver-still-present → analyze runs but skips chart SVG; (b) waiver-removed → analyze runs across chart SVG. The test never reaches `analyze()` either way.

**Net:** the waiver removal is **theoretically sound but not empirically verified**. The 3 axe tests that DO pass locally (home, labs, auth) do not render the chart, so they don't exercise the chart SVG either way.

---

## Visual Regression CI Status

**`Run visual regression` (LKID-81 workflow):** SUCCESS — completed 2026-04-30 20:32:13 UTC, runtime ~2m 24s on `ubuntu-latest`. This is the canonical visual-diff verification. Linux baselines committed by `update-baselines` workflow_dispatch on the LKID-91 merge are matched within tolerance. Local macOS rendering differences are expected and documented in `visual-regression.yml:8-13`.

**Other checks on PR #78:**
- CodeRabbit: SUCCESS
- Vercel: SUCCESS (preview deployed)
- Vercel Preview Comments: SUCCESS

---

## Type-Safety Verification

`cd app && npx tsc --noEmit` → exit 0. No diagnostics. The `TrajectoryId` union narrowing (removed literal `"bun_13_24"`) and the `combineMidScenarios` re-export removal would BOTH have produced compile errors in any caller — none surfaced, confirming the helper was truly dormant.

Cross-checked outside `app/src/components/chart/`:
- `app/src/app/` — no references.
- `app/src/components/results/` — no references (eslint pass on this dir confirms).
- `app/tests/` — no references.
- `backend/` — no references.

No `as TrajectoryId` casts to `"bun_13_24"` lurking anywhere.

---

## Risk Callouts

1. **[NOTE] Chart-SVG axe scan unverified end-to-end.** The `results page` axe test times out before reaching `analyze()` on both PR branch and main. Removing the waiver is theoretically correct (LKID-91 hides the failing yellow line), but no automated test currently scans the chart SVG with axe. **Mitigations:** (a) visual-regression CI catches palette drift; (b) the rendered chart strokes (navy + gray) are mathematically AA-pass at the design hex values documented in `transform.ts:34-72`. **Recommend follow-up:** investigate why `results-heading` doesn't render within 10s when the API is mocked locally — likely a real defect in the route-mock + dev-server interaction. Once fixed, the chart-SVG axe scan would gain real automated coverage. Filing this as a Yuri non-blocking nit, not a release blocker.

2. **[NOTE] No axe CI workflow exists.** `.github/workflows/` contains only `post-deploy-smoke.yml` and `visual-regression.yml`. Axe-core tests are NOT run on PR. This means even if the local timeout were fixed, regressions in chart contrast would only be caught on a developer machine. Pre-existing gap, out of scope for LKID-92, but worth noting since this PR removes the only contrast-related guardrail (the waiver) and now relies entirely on visual-regression for chart-palette protection.

3. **[PASS] Local visual-regression failures.** Already documented in PR body. Linux-rendered baselines do not match macOS rendering; CI on Linux is canonical. Confirmed SUCCESS on PR #78.

4. **[PASS] Type system protection.** The `TrajectoryId` union narrowing means any future code that tries to use `bun_13_24` will fail compilation. Combined with the removed re-export, the dormant helper deletion is type-safe and irreversibly clean.

---

## Blocking Issues

None.

---

## Non-Blocking Nits

| ID | Component | Issue | Recommendation |
|----|-----------|-------|----------------|
| QA-N1 | `app/tests/a11y/accessibility.spec.ts:116` | `getByTestId("results-heading")` waitFor times out locally — pre-existing on main. Means the chart-SVG axe scan (the very thing the waiver was previously hiding) is not actually verified to pass with the waiver removed. | File a follow-up card to investigate the route-mock + dev-server interaction. Once the test passes, the chart-SVG axe scan gains real coverage and the LKID-89 binding-policy doc comment in `transform.ts:24` becomes empirically grounded. |
| QA-N2 | `.github/workflows/` | No axe CI workflow. The 5 axe tests in `accessibility.spec.ts` only run on developer machines. | Future card: add an a11y CI job that runs `playwright test --config=playwright.a11y.config.ts` on Linux. Especially valuable now that the chart SVG is back in scope. |
| QA-N3 | `app/src/components/chart/transform.ts:54` | The `bun_18_24` config entry is still present (engine still computes the series), with comment "FAILS AA, intentional per LKID-80". Since LKID-91, that line is hidden by `selectDisplayTrajectories` before render — the comment is technically still accurate (the color WOULD fail AA if rendered) but a future reader could be confused. | Optional: append "(hidden by `selectDisplayTrajectories`)" to the comment. Not required for this PR. |

---

## Overall Readiness Assessment

**READY TO MERGE.**

- All 11 ACs verified.
- Type-safety preserved (tsc clean).
- Lint clean.
- Visual-regression CI green on Linux runner (canonical baseline machine).
- No backend, frontend, or test consumers of the deleted symbols.
- Local axe-test timeouts are pre-existing on main, not introduced by this PR.

The chart-SVG axe scan gap (QA-N1) is a real but pre-existing defect that this PR does not worsen. The PR's stated theoretical justification — LKID-91 hides the AA-failing line, leaving only AA/AAA-passing strokes rendered — is mathematically correct per the documented contrast values in `transform.ts:34-72` and verifiable on the deployed Vercel preview by manual inspection if required.

Recommend Luca merge after Copilot completes its review, file QA-N1 and QA-N2 as follow-up cards (Low priority, post-launch), and proceed to LKID-92 closure.
