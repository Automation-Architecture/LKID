# LKID-91 — PR #75 QA Verdict

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**PR:** [#75](https://github.com/Automation-Architecture/LKID/pull/75)
**Branch:** `feat/LKID-91-chart-2-line`
**Card:** LKID-91 — chart simplification per Lee feedback (2 lines)
**Scope:** Display-only filter — engine + API untouched. Patient-facing chart now shows BUN 12-17 (navy, was `bun_13_17`) + No Treatment (gray); BUN ≤12 (green) and BUN 18-24 (gold) are hidden.

---

## Top-Level Verdict: **PASS**

All AC met. Engine output preserved (zero backend/engine diffs). Visual baselines visually confirm 2-line chart with correct callouts, axes, dialysis band/line, and starting-eGFR marker. TypeScript + ESLint clean. Local visual-regression run: **2/2 PASS**.

One non-blocking risk: macOS-regenerated baselines may diff against CI Linux Chromium — recovery path is `update-baselines` workflow_dispatch (LKID-81). Not a fail of the PR itself.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| AC checklist | 14 | 14 | 0 | 0 |
| Engine preservation | 4 | 4 | 0 | 0 |
| User-facing labels | 4 | 4 | 0 | 0 |
| Tests + tooling | 3 | 3 | 0 | 0 |
| Risk callouts | 4 | — | — | 4 |
| **Totals** | **29** | **25** | **0** | **4** |

---

## AC Checklist

### Chart (`EgfrChart.tsx`)

- ✓ `bun_lte_12` trajectory line is hidden — `selectDisplayTrajectories()` filters to `["bun_13_17", "no_treatment"]` (transform.ts:213); `EgfrChart` consumes `displayData` (line 1343).
- ✓ `bun_18_24` trajectory line is hidden — same filter.
- ✓ `bun_13_17` line relabeled "BUN 12-17" — `TRAJECTORY_CONFIG.bun_13_17.label = "BUN 12-17"` (transform.ts:53). The engine output key is unchanged.
- ✓ `no_treatment` unchanged.
- ✓ End-point callouts updated — `EgfrChart.tsx:908-960` renders only the 2 displayed lines (`bun_13_17` + `no_treatment`); each gets a circle-and-value callout. Visually verified in both baselines.
- ✓ Healthy-range gradient fill dropped — anchor was `bun_lte_12` (EgfrChart.tsx:529); after filtering, `find()` returns undefined and the JSX bails to null. Visually verified — no green gradient in either baseline.

### ResultsView (`ResultsView.tsx`)

- ✓ Scenario cards 4 → 2 (BUN 12-17, No Treatment) — `SCENARIO_META` has 2 entries (ResultsView.tsx:109-117).
- ✓ Heart-icon legend pruned to 2 rows — `scenarios.map((s) => <div className="legend-row">…</div>)` iterates SCENARIO_META.
- ✓ 5yr / 10yr eGFR + dialysis-age values come from existing engine fields via `valueAtMonth()` and `traj.dialysisAge`.

### PDF (`PdfReport.tsx`)

- ✓ Same 2-line chart in chrome mode — uses the shared `EgfrChart` with `chrome={false}` (line 489), which applies the same `selectDisplayTrajectories()` filter.
- ✓ Same 2 stat cards — `SCENARIO_META` has 2 entries (PdfReport.tsx:89-92); CSS grids `repeat(2, 1fr)` on `.sc-pills` (line 293) and `.sc-cards` (line 313).

### Page CSS (`app/results/[token]/page.tsx`)

- ✓ `.scenario-pills` and `.scenario-cards` grids changed to `repeat(2, 1fr)` (lines 265, 289). LKID-91 comment present.

### Tests + baselines

- ✓ `trajectoryPathCount: 2` in both `STAGE_3A_RESULT` and `STAGE_4_RESULT` scenarios (chart-regression.spec.ts:154, 159).
- ✓ Baselines regenerated — both PNGs dated 2026-04-30 14:39.

---

## Engine-Output-Preservation Invariant (CRITICAL)

- ✓ **`MOCK_PREDICT_RESPONSE` intact** — transform.ts:280-298 still has all 4 trajectories (`no_treatment`, `bun_18_24`, `bun_13_17`, `bun_12`) and all 4 `dial_ages`. The chart filter is exercised against the full engine shape.
- ✓ **`TRAJECTORY_CONFIG` intact** — all 5 entries still present (4 real + the dormant `bun_13_24` LKID-90 helper). Only `bun_13_17.label` changed from "BUN 13-17" → "BUN 12-17".
- ✓ **No backend diffs** — `gh pr diff 75` shows 0 files under `backend/`. Engine continues to emit `bun_lte_12`, `bun_18_24`, `bun_13_17`, `no_treatment` (verified `backend/prediction/engine.py:458-475`, `backend/main.py:480-487`).
- ✓ **`types.ts` unchanged** — `bun_lte_12` and `bun_18_24` references remain in non-rendering code (TrajectoryId union still allows all 4 IDs; backend tests still assert on all 4).

---

## User-Facing Label Audit

Searched `app/src/` (excluding dashboard files which are operator-facing, not patient-facing):

- ✓ "BUN 12-17" appears in `TRAJECTORY_CONFIG.bun_13_17.label` → renders in chart legend (heart row), end-point callout, scenario card, scenario pill, and PDF stat card.
- ✓ "BUN 13-17" does NOT appear in any user-visible string. Old label fully replaced.
- ✓ "BUN ≤ 12" remains only in `TRAJECTORY_CONFIG.bun_lte_12.label` (used to render the trajectory IF `selectDisplayTrajectories` were bypassed), in JSX comments explaining the hidden anchor, and in dashboard files (`LaunchMetrics.tsx`, `WeeklyUpdate.tsx`) — those are Lee-facing, not patient-facing.
- ✓ "BUN 18-24" / "BUN 18–24" remains only in `TRAJECTORY_CONFIG.bun_18_24.label` and in JSX comments + dashboard. Filter prevents render in the patient surface.

---

## Visual Baseline Screenshots Reviewed

- **`chart-stage-3a-baseline.png`** — eGFR=50 baseline. 2 trajectory paths: navy "BUN 12-17" rises gently to ~50 at year 10; gray "No Treatment" declines linearly to ~10. End-point callouts at right edge: navy circle with "50", gray circle with "10". Starting eGFR dot + label "Starting eGFR: 50" at left edge. Dashed pink dialysis line + "Level where dialysis may be needed" label at the eGFR=12 band. "Dialysis range — Year 9" red label sits on the gray line where it crosses 15. Y-axis shows 0/20/40/60; x-axis shows 1/3/5/7/9 yr. **No green line, no gold line, no green gradient fill.**
- **`chart-stage-4-baseline.png`** — eGFR=18 baseline. 2 trajectory paths: navy "BUN 12-17" rises to ~32 then drifts down to ~20; gray "No Treatment" crosses 12 within year 1, plateaus at 0 by year 7. End-point callouts: navy "20", gray "0". Starting eGFR dot + "Starting eGFR: 18". Dashed dialysis line + "Dialysis range — Year 1" label visible. Y-axis shows 0/5/10/20/30. **No green line, no gold line, no green gradient fill.**

Both baselines match LKID-91 acceptance criteria exactly.

---

## Tests + Tooling

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (app/) | Clean |
| `npx eslint src/components/chart src/components/results` | Clean |
| `npm run test:visual` (Playwright visual-regression) | **2/2 passed** in 5.0s |

E2E + a11y suites untouched (no test-id changes per PR body — verified by grepping `data-testid` in changed files; only existing IDs reused).

---

## Risk Callouts (Non-Blocking)

1. **macOS-vs-Linux baseline drift** — The 2 PNGs in `chart-regression.spec.ts-snapshots/` were regenerated on macOS Chromium. Sub-pixel font/anti-aliasing differences vs. CI Linux Chromium may surface as a visual-regression failure on the next CI run. Recovery is well-defined: trigger the `update-baselines` workflow_dispatch from LKID-81 to regenerate on Linux. Not a defect of this PR; flagging so the PR-merger watches the post-merge CI run.
2. **`combineMidScenarios` helper now dormant** — transform.ts:231-274 still defines and exports this LKID-90 helper, but no caller remains in app/src/ (grep confirms only definition + comment hits). Recommend a follow-up nit to delete it (or `// @deprecated` mark it) once LKID-90 chart v3 work either lands or is closed; not blocking since it's pure-additive dead code with no side-effects.
3. **`TRAJECTORY_CONFIG.bun_13_24` also dormant** — same LKID-90 lineage. Same disposition: leave for now, sweep when LKID-90 is resolved.
4. **Sr-only data table reflects 2 trajectories** — `EgfrChart.tsx:1194-1221` iterates `data.trajectories` (which is post-filter `displayData.trajectories`), so the SR table shows only the 2 displayed columns. ARIA `aria-label` on the SVG (line 374) reads `"…2 predicted kidney function scenarios over 10 years"` — coherent with the visual chart. ✓

---

## Blocking Issues

**None.**

## Non-Blocking Nits

| ID | Component | Issue |
|----|-----------|-------|
| NIT-01 | `transform.ts` | `combineMidScenarios` (lines 220-274) and `TRAJECTORY_CONFIG.bun_13_24` (line 74) are dormant after LKID-91. Recommend deletion (or `@deprecated` marker) as a sweep when LKID-90 closes. Pure dead code — no runtime impact. |
| NIT-02 | CI cadence | First CI run on this PR may flag a visual diff because baselines were regenerated on macOS, not Linux. If so, fire the `update-baselines` workflow_dispatch (LKID-81) — do NOT treat as a regression. |
| NIT-03 | `WeeklyUpdate.tsx` / `LaunchMetrics.tsx` | Operator-facing copy still says "4 trajectory lines" / lists all 4 BUN bands. These are Lee-dashboard surfaces and NOT in scope for LKID-91, but PM may want to update copy in a follow-up so Lee's dashboard matches the new patient chart. Not a defect; flagging only. |

---

## Overall Readiness Assessment

**READY for merge** — pending Copilot + CodeRabbit review per project SOP. Engine-preservation invariant holds, AC are met line-for-line, baselines visually correct, local tests green. No blocking issues.

The PR is exactly what its body claims: a display-only filter at the chart-rendering boundary. The single most important QA invariant (engine still emits 4 trajectories; this is not an engine change) is preserved.
