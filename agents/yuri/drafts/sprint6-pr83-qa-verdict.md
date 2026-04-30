# Sprint 6 — PR #83 QA Verdict (LKID-94 follow-up — Wire a11y suite into CI)

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**Window:** Standard verify (~25 min — 2 files, +84/-0, infrastructure-only diff)

---

## PR Metadata

| Field | Value |
|-------|-------|
| PR | [#83](https://github.com/Automation-Architecture/LKID/pull/83) |
| Branch | `feat/LKID-94-a11y-ci-workflow` |
| HEAD SHA | `ca33c7f` (`feat(LKID-94): wire axe-core accessibility suite into CI`) |
| Base | `origin/main` |
| Author | Brad |
| Scope | Add `.github/workflows/accessibility.yml` GitHub Actions workflow that runs the existing axe-core Playwright suite (`tests/a11y/accessibility.spec.ts` + `playwright.a11y.config.ts`) on every frontend-touching PR. Add `npm run test:a11y` script to `app/package.json`. No backend started — spec mocks all API calls via `page.route`. Mirrors the structure of `.github/workflows/visual-regression.yml` (LKID-81). |

---

## Verdict

**PASS-WITH-NITS**

Workflow is well-structured, mirrors the LKID-81 visual-regression sibling correctly, and — most importantly — **the new `Run accessibility suite` job actually passed in CI** (1m10s, run `25190239223`). The `playwright.a11y.config.ts` it depends on already sets `NEXT_PUBLIC_API_URL: http://127.0.0.1:8000` in `webServer.env` per the AGENTS.md gotcha, so the CSP `connect-src` mismatch that haunted LKID-93 is pre-handled. Permissions are minimal (`contents: read`), concurrency is keyed correctly, Chromium binary is cached on `~/.cache/ms-playwright`, and a failure-only artifact upload of `tests/a11y/test-results/` + `playwright-report/` provides debugging surface. Copilot's one review comment misreads the diff and is non-actionable. CodeRabbit + Vercel + Visual-regression checks all green.

Two non-blocking nits below — neither would cause a CI false-positive or a security hole; both are candidates for a follow-up tweak when someone else touches this workflow.

---

## AC-by-AC Checklist

| # | AC | Verdict | Evidence |
|---|----|---------|----------|
| **1** | Trigger paths cover all PRs that could affect rendered output | PASS | `paths:` filter (lines 10-16 of `accessibility.yml`) covers `app/src/**` (catches `globals.css`, all routes, all components, including `app/src/app/{layout.tsx, page.tsx, labs/, gate/, results/, auth/}`), `app/tests/a11y/**`, `app/playwright.a11y.config.ts`, `app/package.json`, `app/package-lock.json`, and the workflow file itself. Sibling `.github/workflows/visual-regression.yml` uses the same scoping philosophy (chart-related paths only). Minor scope gap noted in §Nits below. |
| **2** | Workflow steps match the visual-regression sibling pattern | PASS | Step-by-step parity with `.github/workflows/visual-regression.yml` lines 50-101: checkout → setup-node@v4 (Node 20, npm cache keyed on `app/package-lock.json`) → `npm ci` → `actions/cache@v4` for `~/.cache/ms-playwright` keyed on package-lock hash → conditional `npx playwright install --with-deps chromium` (cache miss) or `playwright install-deps chromium` (cache hit) → `npm run test:a11y` with `CI: "true"` → `actions/upload-artifact@v4` on failure. The only intentional deltas vs visual-regression: (a) no `workflow_dispatch` baseline-regen job (a11y suite has no PNG snapshots — explicitly noted in workflow header comment), (b) no `ref: ${{ github.head_ref \|\| github.ref }}` on the checkout step — uses default merge-commit ref, which is preferred for PR validation (see §Copilot Review below). |
| **3** | `npm run test:a11y` script in `app/package.json` runs the right config | PASS | Diff at `app/package.json:10` adds `"test:a11y": "playwright test --config=playwright.a11y.config.ts"`. Mirrors the `test:visual` script convention exactly. Config file confirmed to exist at `app/playwright.a11y.config.ts` and points at `./tests/a11y` testDir, which contains `accessibility.spec.ts`. |
| **4** | Permissions least-privilege | PASS | `permissions:` block at lines 19-20: `contents: read` only. No `pull-requests`, no `issues`, no `actions: write`, no `id-token`. Matches the principle of least privilege. (Note: visual-regression.yml has `pull-requests: read` because of its `update-baselines` workflow_dispatch path, which doesn't apply here — correctly omitted.) |
| **5** | Concurrency + caching | PASS | `concurrency.group: a11y-${{ github.ref }}` with `cancel-in-progress: true` (lines 22-24) — superseded PR pushes are auto-cancelled. Chromium cache keyed on `${{ runner.os }}-playwright-${{ hashFiles('app/package-lock.json') }}` — invalidates correctly when Playwright version bumps in `package-lock.json`. npm cache via `actions/setup-node@v4` `cache: "npm"` with `cache-dependency-path: app/package-lock.json` — correct. |
| **6** | Artifact upload on failure for debugging | PASS | Lines 75-83: `if: failure()` → `actions/upload-artifact@v4` uploads `app/tests/a11y/test-results/` + `app/playwright-report/`, 14-day retention, `if-no-files-found: ignore` so the step doesn't fail when there's nothing to upload (e.g., suite exited before producing results). Matches the visual-regression upload pattern. |
| **7** | `NEXT_PUBLIC_API_URL` gotcha (per `app/AGENTS.md` LKID-87/93) | PASS | The workflow itself does NOT set this env var, but it doesn't need to: `app/playwright.a11y.config.ts` lines 52-60 set `webServer.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000"` on the spawned `next dev` process, and the spec scopes `page.route` matchers to `process.env.NEXT_PUBLIC_API_URL` (line 30 of `accessibility.spec.ts`), so the config-level setting flows correctly into both the dev server's `next.config.ts::backendOrigin()` CSP `connect-src` directive AND the route mock matcher. The empirical proof: the `Run accessibility suite` job actually passed in CI — if the env var were missing, every results/gate test would have hung on a CSP-blocked fetch and the job would have timed out at 15min. |
| **8** | Suite runs successfully in the CI environment | PASS | `gh pr checks 83` shows `Run accessibility suite` → `pass` in 1m10s on workflow run [25190239223](https://github.com/Automation-Architecture/LKID/actions/runs/25190239223/job/73858151777). All 5 axe-core test cases (home, labs, gate, results-chart-SVG, auth) pass against the head SHA `ca33c7f`. I did not re-run the suite locally — the CI pass against an identical Linux runner is more authoritative for this verdict than a local macOS re-run would be. |

---

## CI Status (at verdict time)

| Check | Status |
|-------|--------|
| Run accessibility suite (NEW — this PR) | PASS (1m10s) |
| Run visual regression | PASS (1m4s) |
| CodeRabbit | PASS |
| Vercel preview | PASS (`https://vercel.com/automation-architecture/kidneyhood/FtSbdZF1GCZtvh9djQQ28NxtUNqV`) |
| Vercel Preview Comments | PASS |
| Update baselines | SKIPPING (correctly — `workflow_dispatch`-only) |
| Mergeable | YES (`gh pr view 83 --json mergeable` → MERGEABLE) |

---

## Copilot Review (Non-Actionable Nit)

Copilot left one inline comment positioned at line 44 of `accessibility.yml` claiming the checkout step pins `ref: ${{ github.head_ref || github.ref }}` and recommending its removal. **This is a misread.** The new `accessibility.yml` checkout step is bare (`- name: Checkout / uses: actions/checkout@v4`) with NO explicit `ref:` — it uses the default `pull_request` merge-commit SHA, which is exactly what Copilot is recommending. The visual-regression sibling DOES set `ref: ${{ github.head_ref || github.ref }}` (line 56 of `visual-regression.yml`), so Copilot conflated the two files. No action required on this PR. Optional follow-up: open a separate cleanup PR to remove the explicit `ref:` from `visual-regression.yml` for the same reasons Copilot cited (PR-from-fork compatibility, merge-commit validation semantics).

---

## Nits (Non-Blocking)

1. **Trigger-path scope gap — `app/`-level config files.** The `paths:` filter covers `app/src/**` and `app/package.json` / `app/package-lock.json`, but NOT `app/next.config.ts`, `app/postcss.config.mjs`, `app/tailwind.config.*`, or `app/tsconfig.json`. A change to `next.config.ts` (e.g., a CSP `connect-src` tweak that breaks the route-mock fetch under enforced CSP — the exact LKID-93 failure mode) would NOT trigger this workflow on the PR that introduced the regression. The visual-regression sibling has the same gap, so this PR isn't worse than the existing convention; calling it out for follow-up. **Suggested fix (separate PR):** add `app/next.config.ts`, `app/postcss.config.mjs`, `app/tsconfig.json` to both workflows' `paths:` filters.

2. **No timeout on the `npm ci` / `npx playwright install` steps.** The job-level `timeout-minutes: 15` covers the whole run, but if `npm ci` hangs (e.g., transient registry outage) it can chew most of the budget before the actual a11y suite runs. **Suggested fix (separate PR or follow-up):** add `timeout-minutes: 5` on `Install dependencies` and `timeout-minutes: 5` on the two `playwright install*` steps. Same pattern would apply to `visual-regression.yml`.

Neither nit affects correctness, security posture, or this PR's ability to gate a11y regressions on the next frontend-touching PR. Both would also apply to the `visual-regression.yml` sibling that already shipped under LKID-81 and went unflagged at QA. They are candidates for a small infra-cleanup card if anyone touches these workflows again.

---

## Local Suite Run (Skipped — Justified)

I did not run `npm ci && npm run test:a11y` locally. Justification:
- The CI environment (Ubuntu Linux + Chromium) is the authoritative target, and the suite already passed there on this exact SHA (run 25190239223).
- A local macOS re-run would not be more reliable than the Linux CI run for an a11y workflow whose CI job is the deliverable.
- The `playwright.a11y.config.ts` and `accessibility.spec.ts` files are unchanged in this PR — they're pre-existing from LKID-26/65/91/92/93. Whatever local-run baseline was true on `main` is still true here.
- The workflow's gate is "does the CI job pass against the trigger paths?" — and it does.

If a local re-run is required by SOP for a workflow-only PR, flag it and I'll add it; it's not in `docs/qa-testing-sop.md` for infrastructure-only diffs.

---

## Blocker Call

**No blockers.** PASS-WITH-NITS. Safe to merge to main.

The two nits above are scope-followups, not gating issues. The Copilot comment is a non-actionable misread.

---

## Recommendations (Optional Follow-ups, Not Blocking)

1. Open a one-line cleanup PR adding `app/next.config.ts`, `app/postcss.config.mjs`, `app/tsconfig.json` to both `accessibility.yml` and `visual-regression.yml` `paths:` filters. Prevents a future LKID-93-style CSP regression from sneaking past CI.
2. Open a follow-up PR removing the explicit `ref: ${{ github.head_ref || github.ref }}` from `visual-regression.yml` for symmetry with this new workflow (and to gain merge-commit validation semantics + fork-PR compatibility).
3. Once this PR merges, every Sprint 6+ frontend PR will gate on axe-core. Consider adding a CONTRIBUTING note pointing at this workflow so the next person who introduces an AA-failing color knows where to look for the failure surface.

---

**Status:** PASS-WITH-NITS — ready to merge.
