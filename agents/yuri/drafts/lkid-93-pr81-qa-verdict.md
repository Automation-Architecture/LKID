# LKID-93 / PR #81 — QA Verdict

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**Branch:** `feat/LKID-93-fix-a11y-results-test`
**PR:** [#81](https://github.com/Automation-Architecture/LKID/pull/81)
**Card:** [LKID-93](https://automationarchitecture.atlassian.net/browse/LKID-93) — fix broken results-page a11y test, exercise chart SVG end-to-end
**Spawned card:** [LKID-96](https://automationarchitecture.atlassian.net/browse/LKID-96) — page-chrome AA contrast fixes (Medium, agent:harshit + agent:inga)

---

## Verdict

**PASS**

Empirical 5/5 a11y pass locally on `feat/LKID-93-fix-a11y-results-test`. Root-cause fix matches the canonical pattern already proven in `playwright.visual.config.ts` (LKID-81). The narrowing of the results-page axe scope from whole-page to `[data-testid="egfr-chart-svg"]` is implemented correctly with `.include(...)` (no `.exclude` waiver), is explicitly justified in the spec comments, and the page-chrome failures it surfaces are properly captured in LKID-96 with detailed AC. No blocking issues.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Root-cause fix | 3 | 3 | 0 | 0 |
| Spec rewrite | 5 | 5 | 0 | 0 |
| Scope narrowing | 4 | 4 | 0 | 0 |
| Empirical verification | 1 | 1 | 0 | 0 |
| LKID-96 follow-up | 5 | 5 | 0 | 0 |
| Tests + tooling | 4 | 4 | 0 | 0 |
| **Totals** | **22** | **22** | **0** | **0** |

---

## AC Checklist

### Root-cause fix (`playwright.a11y.config.ts`)

- [x] **`NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` set in `webServer.env`** — confirmed lines 57–59. Matches `playwright.visual.config.ts` line 102 verbatim.
- [x] **Value matches `next.config.ts::backendOrigin()` allowlist** — `next.config.ts` reads `process.env.NEXT_PUBLIC_API_URL` at build time and emits its origin into `connect-src` (line 95). With `127.0.0.1:8000` set, the dev-server's CSP whitelists exactly the origin the client fetches.
- [x] **`reuseExistingServer: !process.env.CI`** — confirmed line 55. Local re-runs reuse the running dev server; CI always boots fresh. Matches the working visual-regression pattern.

### Spec rewrite (`tests/a11y/accessibility.spec.ts`)

- [x] **Route matcher is correct** — switched from string URL `RESULTS_API_URL` to a regex `RESULTS_API_PATTERN` (lines 31–37). Anchored with `^` and `$`, escapes regex metachars in `API_BASE` and `TEST_TOKEN`, and accepts trailing `?...` query strings. Method-gated to GET only inside `mockResultsGet` (line 74).
- [x] **`API_BASE` default aligned to config** — fallback in spec is now `http://127.0.0.1:8000` (line 29), matching `webServer.env`. Previously was `http://localhost:8000` — host mismatch was a contributing latent bug.
- [x] **Animations disabled** — `disableAnimations()` helper (lines 88–100) zeros out animation/transition durations + delays via `addStyleTag`. Mirrors visual-regression spec. Applied in both gate-page (line 129) and results-page (line 165) tests.
- [x] **Chart paint gates** — results-page test waits for `[data-testid="egfr-chart-svg"]` visible (line 168), `results-heading` visible (line 175), AND `trajectory-line-*` count = 2 (lines 179–181). The count-of-2 gate empirically verifies LKID-91's yellow line removal at the same moment it gates the axe scan.
- [x] **Gate-page test gate raised to 15s** — `getByTestId("gate-form").waitFor({ timeout: 15_000 })` (line 133). Reasonable headroom for dev-server cold starts under CI.

### Scope narrowing (the load-bearing design choice)

- [x] **Results-page axe scope uses `.include`, not `.exclude`** — line 184: `new AxeBuilder({ page }).include('[data-testid="egfr-chart-svg"]').withTags(WCAG_TAGS).analyze()`. This is the inversion the brief flagged as critical. `grep -n "exclude" app/tests/a11y/accessibility.spec.ts` returns only line 147 — a comment explaining LKID-92 removed the exclude waiver. No actual `.exclude(...)` API call.
- [x] **Chart-SVG selector is correct** — `[data-testid="egfr-chart-svg"]` exists in source at `app/src/components/chart/EgfrChart.tsx:375`. The same testid the visual-regression spec targets.
- [x] **Other tests are NOT narrowed** — verified by reading the full spec:
  - `home page` (lines 105–113) — unscoped axe, full page.
  - `labs form` (lines 115–123) — unscoped axe, full page.
  - `gate page` (lines 125–141) — unscoped axe, full page (gates on `gate-form` testid only for paint timing, not for axe scope).
  - `auth page` (lines 194–202) — unscoped axe, full page.
  - Only `results page chart SVG` is narrowed via `.include`. Correct design.
- [x] **Coverage trade-off documented in-line** — lines 144–162 in the spec explain the LKID-91 → LKID-92 → LKID-93 → LKID-96 chain explicitly, so the next agent reading this file understands why the chart-only scope is a bridge, not a permanent waiver.

### Empirical verification — local run

```
$ cd app && CI=1 npx playwright test \
    --config=playwright.a11y.config.ts \
    tests/a11y/accessibility.spec.ts --reporter=list

Running 5 tests using 1 worker

  ✓  1 [chromium-a11y] › tests/a11y/accessibility.spec.ts:105:7 › Accessibility — axe-core audit › home page has no critical or serious violations (667ms)
  ✓  2 [chromium-a11y] › tests/a11y/accessibility.spec.ts:115:7 › Accessibility — axe-core audit › labs form has no critical or serious violations (405ms)
  ✓  3 [chromium-a11y] › tests/a11y/accessibility.spec.ts:125:7 › Accessibility — axe-core audit › gate page has no critical or serious violations (607ms)
  ✓  4 [chromium-a11y] › tests/a11y/accessibility.spec.ts:143:7 › Accessibility — axe-core audit › results page chart SVG has no critical or serious violations (660ms)
  ✓  5 [chromium-a11y] › tests/a11y/accessibility.spec.ts:194:7 › Accessibility — axe-core audit › auth page has no critical or serious violations (330ms)

  5 passed (5.0s)
```

5/5 PASS. Matches Harshit's report exactly. The previously-broken results-page test now reaches `analyze()` on the chart SVG and reports zero critical/serious violations — empirical confirmation that LKID-91's yellow-line hiding plus LKID-92's waiver removal are safe in production.

### LKID-96 follow-up — review

- [x] **Card exists, To Do status** — confirmed via Jira. Summary: "Fix color-contrast AA violations on results page — .sc-pill.gray, .lbl, .foot, footer links". Owners: Harshit (CSS fix) + Inga (design sign-off).
- [x] **Captures all four failure classes with exact node list** — description lists all 10 failing axe nodes: `sc-pill.gray` (No Treatment pill), `.lbl` x2 (5yr / 10yr eGFR labels), `.foot` x2 (Dialysis text), and all three footer links (Privacy, Disclaimer, Contact). Root cause pinned to `--kh-muted` (`#8A8D96`) on tinted backgrounds.
- [x] **References the scope-narrowing in LKID-93** — card description explicitly notes the chart-SVG `.include(...)` scope was the bridge and states the full-page test must be widened once chrome is fixed.
- [x] **AC is actionable and complete** — 7 AC items: (1) `.sc-pill.gray` foreground ≥ 4.5:1, (2) `.lbl` text ≥ 4.5:1, (3) `.foot` text ≥ 4.5:1, (4) footer links ≥ 4.5:1, (5) full-page axe scan zero critical/serious, (6) `accessibility.spec.ts` results-page scope widens back to full-page (the explicit recovery hook for the coverage regression introduced by this PR), (7) all other a11y tests still pass. AC #6 closes the loop cleanly.
- [x] **LKID-95 noted** — LKID-95 is a duplicate card filed in the same session before LKID-96 was created (both are To Do; LKID-96 is the more complete version referenced in the spec comment and PR body). LKID-95 may be closed as duplicate of LKID-96 — non-blocking, but Husser should triage.

### Tests + tooling

- [x] **`npx tsc --noEmit`** — exit 0, zero output. Clean.
- [x] **`npx eslint tests/a11y playwright.a11y.config.ts`** — exit 0, zero output. Clean.
- [x] **No chart/component code touched** — `git diff main...HEAD --stat` returns only `app/playwright.a11y.config.ts` and `app/tests/a11y/accessibility.spec.ts`. Visual-regression baselines remain valid (no shared rendering surface changed). Did not separately re-run `npm run test:visual` — the file-level evidence is sufficient (the macOS-vs-Linux drift problem only fires when chart rendering changes; rendering didn't change).
- [x] **CI status on PR** — `gh pr view 81 --json statusCheckRollup`: CodeRabbit SUCCESS, Vercel SUCCESS, Vercel Preview Comments SUCCESS. No failing checks.

---

## Coverage trade-off — explicit acknowledgement

This PR scopes the results-page axe scan from whole-page to `[data-testid="egfr-chart-svg"]`. That is a coverage **regression vs the test's intended whole-page behavior** but a coverage **improvement vs the test's actual (broken) behavior** — before this PR, the results-page test never reached `analyze()`, so it was scanning nothing. The narrowing also makes the explicit purpose of LKID-93 (empirical verification of the chart strokes after LKID-91 hue removal) realizable today, before the chrome failures are fixed.

LKID-96 AC #3 explicitly requires the spec scope to widen back to whole-page (or to add a new chrome-scoped test) once the chrome contrast fixes land. The recovery is tracked, owned, and gated. Acceptable as a temporary bridge.

---

## Risk Callouts

1. **Coverage regression on results-page chrome** (Medium) — page-chrome a11y is not currently scanned. Mitigation: LKID-96 AC #3 closes this loop. Watch that LKID-96 doesn't drift in priority.

2. **`NEXT_PUBLIC_API_URL` is now load-bearing in two Playwright configs** (Low) — visual + a11y both require this env var paired with `next.config.ts::backendOrigin()` under enforced CSP. The rationale is well-documented in both `playwright.a11y.config.ts` lines 36–51 and the spec lines 19–28, but a one-line note in `app/AGENTS.md` (or a new `app/tests/README.md`) would help future agents debug faster if they hit the same loading-skeleton timeout from a third config or test file. **Non-blocking nit.**

3. **`!process.env.CI` for `reuseExistingServer`** (Low) — correct pattern; matches visual config. No issue.

---

## Blocking Issues

None.

---

## Non-Blocking Nits

| ID | Component | Issue | Suggested fix |
|----|-----------|-------|---------------|
| N1 | Test plumbing knowledge sharing | The CSP / `NEXT_PUBLIC_API_URL` / `webServer.env` triplet has now bitten three cards (LKID-87 enforcement, LKID-81 visual, LKID-93 a11y). Future agents writing a fourth Playwright config will repeat the mistake. | Add a 3-line bullet to `app/AGENTS.md` under a "Playwright + enforced CSP" section, or create `app/tests/README.md` summarizing the pairing rule and pointing at both configs as references. Not blocking this PR. |
| N2 | Spec wait gate | `expect(...).toHaveCount(2, { timeout: 10_000 })` is correct today (LKID-91 leaves exactly 2 visible trajectory paths). If a future card un-hides the yellow line for an opt-in mode, this test will silently fail. | Add an inline comment near the `toHaveCount(2)` call cross-referencing LKID-91 (already partially done — line 178 mentions LKID-91, but doesn't say "if this count changes, revisit LKID-91"). Non-blocking. |

---

## Overall Readiness Assessment

**READY TO MERGE.** All 22 checklist items PASS. Empirical 5/5 a11y suite green. TypeScript + ESLint clean. CI green (CodeRabbit + Vercel SUCCESS). LKID-96 captures the coverage-recovery work with explicit AC. Two non-blocking nits documented for follow-up but neither gates this merge.

This PR unblocks LKID-94 (axe-in-CI workflow) per the dependency graph in the PR body.
