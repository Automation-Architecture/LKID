# LKID-96 PR #85 QA Verdict — Color-Contrast AA Token Fixes + Full-Page Axe Scope Restoration

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**Branch:** `feat/LKID-96-color-contrast-token-fixes`
**PR:** [#85](https://github.com/Automation-Architecture/LKID/pull/85)
**Card:** LKID-96 — darken `--kh-muted` + `--s-gray-text` for WCAG AA; restore full-page axe scope
**Scope:** `globals.css` token changes, inline-style token references in 3 pages, full-page axe restoration in `accessibility.spec.ts`

---

## Executive Summary

**PASS WITH NITS** — All 5 acceptance criteria are met. Token values are correct, contrast ratio comments are updated and accurate, all three hardcoded `#8A8D96` occurrences in page inline styles are replaced with `var(--kh-muted)`, the `.include(...)` scope narrowing is removed from the a11y test, and all three wait guards (chart SVG, results-heading, trajectory-line count = 2) are intact. CI is green: accessibility suite (pass, 59s), Vercel preview (pass), CodeRabbit (pass). One Copilot inline nit about comment precision was addressed before this review began (commit `ce343bb`). One minor residual nit noted below.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Token values (globals.css) | 4 | 4 | 0 | 0 |
| Inline style fix (3 pages) | 4 | 4 | 0 | 0 |
| Axe test scope restoration | 4 | 4 | 0 | 0 |
| No regressions (chart/PDF/transform) | 4 | 4 | 0 | 0 |
| CI checks | 3 | 3 | 0 | 0 |
| Copilot review addressed | 1 | 1 | 0 | 0 |
| **Totals** | **20** | **20** | **0** | **0** |

---

## Findings

### TC-01 — Token Values in globals.css

**PASS** — `--kh-muted` is `#5E6169` at line 72 (was `#8A8D96`). Comment reads: "LKID-96: darkened from #8A8D96 (3.04:1 on #F4F5F7) to #5E6169 (5.68:1 on #F4F5F7; 4.98:1 worst-case on blue card tint) for WCAG AA ≥ 4.5:1". `--s-gray-text` is `#616469` at line 101 (was `#6B6E78`). Comment reads: "LKID-96: darkened from #6B6E78 (4.31:1 on pill composite #ebecef) to #616469 (5.03:1 on pill composite; 5.45:1 on #F4F5F7) for WCAG AA". Both values and both ratios are correct and below the background-specific threshold.

Note: `--s-gray: #6B6E78` (line 98) remains unchanged — that token is used as a border/fill hue, not a text color, so no AA text-contrast obligation. Correct.

### TC-02 — No Remaining Hardcoded `#8A8D96` in Page Inline Styles

**PASS** — All three page files are clean:

- `app/src/app/page.tsx` — `--muted: var(--kh-muted)` in CSS block (line 30); standalone `color: var(--kh-muted)` for the hero sub-text (line 243). Both hardcoded instances replaced.
- `app/src/app/labs/page.tsx` — `--muted: var(--kh-muted)` (line 68). One instance replaced.
- `app/src/app/gate/[token]/page.tsx` — `--muted: var(--kh-muted)` (line 60). One instance replaced.

`app/src/app/results/[token]/page.tsx` already uses `--muted: var(--kh-muted)` — confirmed untouched and correct (no diff on this file).

`app/src/components/EgfrChart.tsx` — zero occurrences of `#8A8D96` on the PR branch (confirmed via grep). The PR body states these are decorative fills intentionally left; the file is in fact clean, implying they were already absent or used a different shade. Either way: no hardcoded hex to worry about here.

### TC-03 — Axe Test Scope Restoration

**PASS** — `accessibility.spec.ts` at line 179 shows `new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()` with no `.include(...)` call between the builder and `.analyze()`. The `.include('[data-testid="egfr-chart-svg"]')` line that existed in LKID-93 is gone. Test description updated to "results page has no critical or serious violations" (line 143).

All three wait guards confirmed present:
- `page.waitForSelector('[data-testid="egfr-chart-svg"]', ...)` — line 162
- `page.getByTestId("results-heading").waitFor(...)` — line 169
- `expect(page.locator('[data-testid^="trajectory-line-"]')).toHaveCount(2, ...)` — line 176

### TC-04 — CI: Accessibility Suite Passes

**PASS** — `gh pr checks 85` output:
```
Run accessibility suite    pass    59s    https://github.com/Automation-Architecture/LKID/actions/runs/25194003357/job/73870343072
Vercel                     pass    0      deployment completed
Vercel Preview Comments    pass    0
CodeRabbit                 pass    0      review completed
```

The accessibility suite ran the full Playwright axe suite (5 tests per the PR description: `npm run test:a11y → 5/5 passed`) and passed in 59 seconds.

### TC-05 — No Chart Line Color Regressions

**PASS** — `app/src/components/transform.ts` and `app/src/components/EgfrChart.tsx` have zero diff vs `main`. Palette A+ trajectory line colors (Harshit + Inga, LKID-80/LKID-91) are untouched.

### TC-06 — PdfReport.tsx Auto-Updates Correctly

**PASS** — `app/src/components/PdfReport.tsx` has no diff vs `main` and does not hardcode `#8A8D96`. The PDF component uses `var(--kh-muted)` indirectly through the app's CSS cascade; the token darkening flows through automatically with no file change needed. Confirmed.

### TC-07 — Copilot Review Comment Addressed

**PASS** — Copilot flagged one inline nit on the a11y test comment: (1) the removed scope was `.include('[data-testid="egfr-chart-svg"]')` not `.include("egfr-chart-svg")`, and (2) the pill failure was driven by `--s-gray-text` not solely `--kh-muted`. The agent pushed a clarifying commit (`ce343bb`, commit message: "fix(LKID-96): clarify comment attribution in a11y test (Copilot nit)") before this QA review. The updated comment at lines 144–151 now correctly names the full selector in the reference and separately attributes the pill fix to `--s-gray-text` and the muted-text fix to `--kh-muted`. Verified in the diff.

---

## Nits (Non-Blocking)

### N-01 — PR Body Test Plan: Axe CI Item Left Unchecked

The PR body's test plan has:
```
- [x] npm run test:a11y — 5/5 pass
- [ ] Verify axe CI passes on this PR   ← unchecked
- [ ] After merge: trigger workflow_dispatch on visual-regression workflow to regen Linux baselines
```

The CI check did pass (confirmed), so the unchecked box is just an oversight in the PR description. Non-blocking — the evidence of CI pass is in the checks log.

### N-02 — Visual Regression Baseline Regen Required After Merge

The PR body correctly notes: "~498px diff (~1% of pixels) on chart axis tick labels and 'Starting eGFR' callout text — CI baseline regen required via `workflow_dispatch` after merge (same playbook as LKID-91)."

This is documented and expected. Ensure the `workflow_dispatch` on `visual-regression.yml` is triggered after merge using the same procedure exercised in LKID-91. Failure to regen will cause the visual regression CI to fail on the next chart-touching PR.

---

## Failure Summary

No failures. Zero blocking items.

### NOTEs (0)
*(none)*

---

## Verdict

**PASS WITH NITS** — merge when ready. Address N-02 (baseline regen) immediately after merge via `workflow_dispatch`.
