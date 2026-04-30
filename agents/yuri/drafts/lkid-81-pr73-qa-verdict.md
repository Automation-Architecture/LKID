# LKID-81 / PR #73 — Visual Regression Wire-up — QA Verdict

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**Branch:** `feat/LKID-81-visual-regression`
**PR:** [#73](https://github.com/Automation-Architecture/LKID/pull/73)
**Card:** [LKID-81](https://automationarchitecture.atlassian.net/browse/LKID-81) — Wire up visual-regression tests
**Origin:** Yuri's PR #59 verdict nit #1; block memo `agents/harshit/drafts/lkid-80-snapshot-refresh-blocked.md`

---

## Verdict: **PASS WITH NITS**

Infrastructure is sound. Spec correctly mocks the tokenized flow's single client-side fetch, both Chromium baselines render real charts (4 trajectories + dialysis band + axes + callouts), CI workflow is appropriately scoped, and the negative-case demonstration is documented in the PR body. Local `npm run test:visual` ran clean (`2 passed (5.1s)`).

The only material risk is the platform-suffix removal — baselines were generated on macOS but CI runs on Linux. This is a documented, mitigated risk (the agent built a `workflow_dispatch update-baselines` mode specifically for it), so I'm calling PASS rather than blocking. Expectation: **the first CI run on Linux will likely fail with a font-rendering diff and require one workflow_dispatch run to regenerate baselines on the runner**. This is acceptable per the PR's "Test plan" checklist item.

---

## Summary Table

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Acceptance criteria | 6 | 6 | 0 | 0 |
| Engineering / risk | 4 | 3 | 0 | 1 |
| Hygiene nits | 3 | 0 | 0 | 3 |
| **Totals** | **13** | **9** | **0** | **4** |

---

## AC Checklist

### AC-1: `@playwright/test` installed — **PASS**
- `app/package.json:44` — `"@playwright/test": "^1.59.1"` in devDependencies. Single dev-dep addition.
- npm is canonical here (`app/package-lock.json` is checked in, no `bun.lock` / `bun.lockb` anywhere in the repo). The agent's choice of `npm ci` in CI matches the existing convention. No bun nit.

### AC-2: Spec rewritten for tokenized flow — **PASS**
- `app/tests/visual/chart-regression.spec.ts:253` — navigates to `/results/${scenario.token}`.
- `mockResultsGet` (line 164) intercepts `GET ${API_BASE}/results/{token}` via `page.route` with a host-pinned RegExp; non-GET methods fall through (`route.continue()`).
- The Results page (`app/src/app/results/[token]/page.tsx:578`) makes exactly one client-side fetch — `apiUrl('/results/{token}')` — fully covered by the mock. PostHog is a silent no-op without `NEXT_PUBLIC_POSTHOG_KEY` (verified in `app/src/lib/posthog-provider.tsx:51`); Sentry is gated similarly. No leftover `**/predict` references in the spec (only comments referencing `prediction-flow.spec.ts` as the precedent).
- Stage 3a (eGFR 50, no threshold crossing) and Stage 4 (eGFR 18, crosses dialysis threshold) fixtures are visually distinct — confirmed via baseline images below.

### AC-3: Baselines generated and committed — **PASS**
- Both PNGs at `app/tests/visual/snapshots/chart-regression.spec.ts-snapshots/` (796 × 399, 8-bit RGB):
  - `chart-stage-3a-baseline.png` (32,401 B) — green/navy/yellow trajectories above the dialysis line; no-treatment line declines linearly to the "10" callout (does NOT cross threshold). Confidence axes labeled correctly. **Real chart.**
  - `chart-stage-4-baseline.png` (35,341 B) — same four trajectories; no-treatment line crosses the dashed dialysis threshold around month 60 and bottoms out at "0" callout. Threshold band tinted. **Real chart, scenario-distinct from 3a.**

### AC-4: CI workflow — **PASS**
- `.github/workflows/visual-regression.yml`:
  - Path triggers (lines 17–24) include the AC-required `app/src/components/chart/**` and `app/src/app/results/**`, plus reasonable additions (`app/src/components/results/**`, the spec dir, the visual config, package files, the workflow itself).
  - 0.1% pixel-ratio threshold enforced via `playwright.visual.config.ts:48` (`maxDiffPixelRatio: 0.001`).
  - Diff PNGs uploaded as `visual-regression-diffs` artifact on failure (lines 118–127), 14-day retention.
  - `workflow_dispatch update-baselines` mode is gated on the input boolean and only commits if `git diff --quiet` reports baseline changes (line 97). Push-back uses `permissions: contents: write` (line 42) — appropriate for the same-repo branch push pattern. **Not** triggered on PR runs.
  - `concurrency: cancel-in-progress: true` keeps stale runs from piling up.

### AC-5: README — **PASS**
- `app/tests/visual/README.md` covers: how it works (mocking via `page.route`), why `NEXT_PUBLIC_API_URL` is set (CSP allowlist constraint, lines 41–49), running locally, regenerating baselines (with explicit "When NOT to do it" guidance, lines 82–87), reading a CI failure (artifact contents documented, lines 102–114), threshold rationale, **and** the cross-platform recovery path (`workflow_dispatch update-baselines`, lines 126–138). Strong doc.

### AC-6: Negative-case demonstration — **PASS**
- PR body shows the deliberate `#D4A017 → #0000FF` flip producing 1,318-pixel diffs on both scenarios with diff PNG attachment, then the revert passing in 5.4s.
- `git log` on the branch shows a single commit (`e680404`), and `git log -p -- app/src/components/chart/transform.ts` shows no `0000FF` ever introduced. The destructive change was never committed. Clean.

---

## Engineering / Risk Checks

### R-1: Platform-suffix removal — **NOTE [MEDIUM]**
- `playwright.visual.config.ts:37` drops `{platform}` from `snapshotPathTemplate`, making one PNG serve macOS + Linux + CI.
- Baselines in this PR were generated on macOS (Brad's local). Chromium on Ubuntu CI WILL render Manrope/Nunito Sans differently at sub-pixel granularity. **First CI run is likely to fail** with a font-AA diff that exceeds 0.1%.
- Mitigation in place: the `workflow_dispatch update-baselines` mode is built specifically to regenerate Linux baselines on the runner and push them back. README documents this on lines 126–138, and the PR's "Test plan" checklist item 3 acknowledges it.
- **My stance:** PASS, do not block. The mitigation is real and documented. But the orchestrator should expect to dispatch the `update-baselines` workflow once after merge to bring the committed PNGs into Linux-canonical form. After that, the safety net is genuine.

### R-2: CSP / `NEXT_PUBLIC_API_URL` — **PASS**
- The agent correctly identified that LKID-87's enforcing CSP would block fetches to non-allowlisted origins before `page.route` could intercept them. Setting `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` on the dev server's env (`playwright.visual.config.ts:101–103`) puts the origin in the build-time `connect-src` allowlist; `page.route` then intercepts the request entirely — no backend needed. Verified locally (test passed without any FastAPI running).
- Using `127.0.0.1` (not `localhost`) sidesteps IPv6/IPv4 ambiguity. Good call.

### R-3: Mock breadth — **PASS**
- The Results page makes exactly one outbound network call: `GET /results/{token}`. The mock covers it.
- PostHog and Sentry are key-gated and inactive in the test env.
- `route.continue()` fall-through on non-GET keeps the spec resilient if Next.js HMR pings the API host (it shouldn't, but harmless if it does).

### R-4: Determinism — **PASS**
- `disableAnimations` (line 198) injects a `*, *::before, *::after { animation-duration: 0s; transition-duration: 0s }` style tag, plus an explicit `.skeleton { animation: none }` for the loading-pulse keyframe.
- `waitForChartStable` (line 216) gates on: SVG present, exactly 4 `[data-testid^="trajectory-line-"]` paths, `document.fonts.ready`, and a stable bounding box. Solid four-step gate against partial-render screenshots.

---

## Tests Run

```
$ cd app && npm install
added 1 package, audited 973 packages in 5s

$ npx playwright install chromium
(complete)

$ npm run test:visual

> app@0.1.0 test:visual
> playwright test --config=playwright.visual.config.ts

Running 2 tests using 1 worker

  ✓  1 chart matches baseline -- stage-3a-baseline (~3.5s)
  ✓  2 chart matches baseline -- stage-4-baseline (~1.6s)

  2 passed (5.1s)
```

Local environment: macOS 25.4.0 (darwin), Chromium installed via `npx playwright install chromium`. Same OS as the agent who generated the baselines, so the 0.1% threshold holds locally.

---

## Non-blocking Nits

| ID | File:Line | Issue |
|----|-----------|-------|
| N-01 | `.github/workflows/visual-regression.yml:90–107` | The auto-commit message uses an indented heredoc with leading whitespace inside the message body (lines 102–106). `git commit -m` will preserve those leading spaces; harmless but slightly ugly in the final commit. Optional cleanup in a follow-up. |
| N-02 | `app/tests/visual/chart-regression.spec.ts:43` | `TIME_POINTS` is a 15-entry array but `STAGE_4_RESULT.trajectories.no_treatment` (line 110) hits 0 at index 10 and stays 0 for indices 11–14. That's the desired flat-line-at-floor visual, but a brief code comment ("flat-zero floor after dialysis crossover — intentional") would help future readers. |
| N-03 | `app/playwright.visual.config.ts:96–104` | `webServer.command: "npm run dev"` builds nothing — `next dev` runs in dev mode with HMR. CI's first run includes the cold-start Next compile (~30s). Acceptable for a 15-minute workflow timeout, but if CI minutes become a concern, a future optimization is `next build && next start` to skip dev-mode overhead. |

---

## Blocking Issues

**None.**

---

## Overall Readiness

**READY TO MERGE** with the following caveat to the orchestrator:

1. After merging, expect the next PR that touches a chart-trigger path to fail the visual-regression workflow on its first run with a Linux font-AA diff. The recovery is documented: dispatch the `Visual regression / update-baselines` workflow_dispatch on that branch to regenerate Linux baselines on the runner, then re-run the PR check. After that one re-baseline cycle, the safety net is fully trustworthy.

2. Optional follow-up (not blocking): a small PR to dispatch `update-baselines` on `main` immediately after merging this PR, so the committed baselines ARE Linux-canonical from day one. Either approach is fine.

The stated origin of this card (my own PR #59 nit #1) is now resolved: visual regression is wired up against the real tokenized-flow Results page, with deterministic mock data, a tight 0.1% threshold, and a CI workflow scoped to chart-touching changes only.
