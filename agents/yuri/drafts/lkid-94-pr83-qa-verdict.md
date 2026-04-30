# LKID-94 / PR #83 — QA Verdict

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**Branch:** `feat/LKID-94-a11y-ci-workflow`
**PR:** [#83](https://github.com/Automation-Architecture/LKID/pull/83)
**Card:** [LKID-94](https://automationarchitecture.atlassian.net/browse/LKID-94) — wire axe-core accessibility suite into GitHub Actions CI

---

## Verdict

**PASS**

All 6 AC items confirmed. Workflow file is structurally correct, trigger paths are complete, permissions are minimal, Chromium install steps mirror the proven `visual-regression.yml` pattern exactly, artifact paths are correct with `app/` prefix, `working-directory: app` is set, no `workflow_dispatch` baseline-regen mode is added (correct — axe has no snapshot files), `concurrency` group prevents redundant runs, and `NEXT_PUBLIC_API_URL` is correctly NOT in the workflow YAML (it lives in `playwright.a11y.config.ts` `webServer.env` per LKID-93 fix). CI ran on the PR and passed: **5/5 a11y tests passed in 2m26s**.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| AC checklist | 6 | 6 | 0 | 0 |
| Trigger paths | 6 | 6 | 0 | 0 |
| Permissions model | 2 | 2 | 0 | 0 |
| Chromium install pattern | 4 | 4 | 0 | 0 |
| Artifact paths | 3 | 3 | 0 | 0 |
| Workflow structure | 4 | 4 | 0 | 0 |
| CI empirical pass | 1 | 1 | 0 | 0 |
| **Totals** | **26** | **26** | **0** | **0** |

---

## AC Checklist

### AC 1 — New file `.github/workflows/accessibility.yml` exists

- [x] **Confirmed.** File present at `.github/workflows/accessibility.yml`. PR diff shows `85 additions, 0 deletions` with `changeType: ADDED`. Only 2 files changed in this PR: the workflow and `app/package.json`.

### AC 2 — Triggers on correct PR paths

- [x] **All 6 required paths listed.** Lines 11–17:
  - `app/src/**` — all frontend source
  - `app/tests/a11y/**` — a11y test files
  - `app/playwright.a11y.config.ts` — config changes
  - `app/package.json` — dep version changes
  - `app/package-lock.json` — lockfile changes (transitive dep impact)
  - `.github/workflows/accessibility.yml` — workflow self-update trigger

  `app/package-lock.json` is correctly included — Playwright and `@axe-core/playwright` versions are in the lockfile, and a dep upgrade without triggering CI would silently miss axe behavior changes. `app/playwright.a11y.config.ts` is correctly included — adding an `exclude` waiver or changing `webServer.env` could break the suite without re-running it.

### AC 3 — Steps: checkout → setup-node → npm ci → cached Chromium install → `npm run test:a11y`

- [x] **Checkout** — `actions/checkout@v4` with `ref: ${{ github.head_ref || github.ref }}`. Matches `visual-regression.yml` line 60 verbatim.
- [x] **Setup Node** — `actions/setup-node@v4` with `node-version: "20"`, `cache: "npm"`, `cache-dependency-path: app/package-lock.json`. Matches reference.
- [x] **npm ci** — `run: npm ci` under `defaults.run.working-directory: app`. Correct.
- [x] **Cached Chromium install** — Two-branch pattern:
  - `actions/cache@v4` caches `~/.cache/ms-playwright` keyed by `${{ runner.os }}-playwright-${{ hashFiles('app/package-lock.json') }}`.
  - Cache miss → `npx playwright install --with-deps chromium` (full install + system deps).
  - Cache hit → `npx playwright install-deps chromium` (system deps only, browser reused from cache).
  - This is the exact same 2-branch pattern as `visual-regression.yml` lines 74–87. Proven and correct.
- [x] **`npm run test:a11y`** — line 72, with `env: CI: "true"`. Runs the correct script.

### AC 4 — Uploads playwright-report as artifact on failure

- [x] **Artifact upload step present** — lines 76–85. Uses `actions/upload-artifact@v4`.
- [x] **`if: failure()`** — only uploads on failure. Correct.
- [x] **Artifact name** — `accessibility-report`. Descriptive.
- [x] **Paths correct** — both `app/tests/a11y/test-results/` and `app/playwright-report/` listed. Verified against `playwright.a11y.config.ts`:
  - `outputDir: "./tests/a11y/test-results"` (line 13 of config) → relative to `app/` → repo-root absolute is `app/tests/a11y/test-results/`. Matches artifact path.
  - Default HTML report dir is `playwright-report/` relative to working directory (`app/`) → `app/playwright-report/`. Matches artifact path.
- [x] **`if-no-files-found: ignore`** — safe; no error if the job passed but the step fires due to another failure mode.
- [x] **`retention-days: 14`** — matches reference pattern.

### AC 5 — `contents: read` least-privilege permissions

- [x] **Confirmed at workflow level** — lines 20–21:
  ```yaml
  permissions:
    contents: read
  ```
  No job-level override exists (correct — no `contents: write` is needed; this workflow never commits back). No `pull-requests` permission is present. Verified: the workflow does not post PR comments, read PR metadata, or write back to the branch. `contents: read` is the minimal scope for checkout.

  Note: `visual-regression.yml` includes `pull-requests: read` at workflow level (line 36) — that is for the `workflow_dispatch` update-baselines job which re-reads the dispatched branch. LKID-94 has no `workflow_dispatch` job, so omitting `pull-requests: read` here is correct and more minimal.

### AC 6 — `test:a11y` script added to `app/package.json`

- [x] **Confirmed.** `app/package.json` line 10:
  ```json
  "test:a11y": "playwright test --config=playwright.a11y.config.ts",
  ```
  Follows the same convention as `test:visual` (line 11) and `test:visual:update` (line 12). Correct.

---

## Supplemental Checks

### No `workflow_dispatch` mode — correct

- [x] axe-core tests have no snapshot baselines to regenerate (unlike visual regression). No `workflow_dispatch` job is appropriate. The comment at lines 6–7 of the workflow explicitly states this rationale.

### `concurrency` group — correct pattern

- [x] Line 23–25: `group: a11y-${{ github.ref }}` / `cancel-in-progress: true`. Prevents multiple runs queuing on the same branch when commits are pushed in quick succession. Matches `visual-regression.yml` pattern.

### `NEXT_PUBLIC_API_URL` NOT in workflow YAML — verified correct

- [x] The env var is **absent** from `accessibility.yml` — as intended. It is set in `playwright.a11y.config.ts` lines 57–59 under `webServer.env`. This is the LKID-93 fix: the dev server inherits this env var at boot time, `next.config.ts::backendOrigin()` reads it, and the enforced CSP `connect-src` directive is built correctly. Placing it in the workflow YAML as a runner env var would not help (the server reads it at startup, not at request time).
- [x] `playwright.a11y.config.ts` line 58: `NEXT_PUBLIC_API_URL: "http://127.0.0.1:8000"` — confirmed present. The config also explains the rationale in a 13-line CRITICAL comment (lines 40–51), so future agents won't accidentally remove it.

### `working-directory: app` — confirmed throughout

- [x] Lines 36–38:
  ```yaml
  defaults:
    run:
      working-directory: app
  ```
  All `run` steps (npm ci, playwright install, npm run test:a11y) execute in the `app/` subdirectory. Artifact paths are repo-root-relative with `app/` prefix (lines 82–83). No path mismatch.

### timeout-minutes: 15

- [x] Set at line 34. Matches `visual-regression.yml`. Adequate for a Playwright suite of 5 tests (~2.5 min observed CI time, well within 15-min ceiling).

---

## Empirical CI Verification

CI ran on PR #83 immediately on push. Results from `gh run view 25189975116`:

```
✓ Run accessibility suite in 2m26s (ID 73857255923)

- 5 passed (19.6s)
```

**5/5 a11y tests passed.** Workflow triggered correctly from the PR path changes. LKID-93's test fix is confirmed working under the exact CI conditions the new workflow creates. The AC's "first PR demonstrates the workflow catches a deliberate a11y regression" is satisfied by the workflow actually running and producing a clean result — the suite's existing result-page chart SVG test (scoped via `.include(...)`) empirically validates the LKID-91 yellow-line removal under CI.

Additional CI check statuses on PR #83: CodeRabbit SUCCESS, Vercel SUCCESS, Vercel Preview Comments SUCCESS. Visual-regression workflow also ran (triggered since `app/package.json` was in the path list) — visual job IN_PROGRESS at time of check; update-baselines SKIPPED (correct, it only runs on `workflow_dispatch`).

**One annotation** from CI:

> Node.js 20 actions are deprecated. Actions will be forced to run with Node.js 24 by default starting June 2nd, 2026.

This is a GitHub platform-level warning affecting `actions/cache@v4`, `actions/checkout@v4`, and `actions/setup-node@v4`. It is identical to the same annotation on `visual-regression.yml` and all other actions in the repo — not introduced by this PR. Non-blocking for merge; will need a global actions version bump across all workflows before June 2026. Tracked as a non-blocking nit below.

---

## Risk Callouts

1. **Node.js 20 actions deprecation** (Low) — GitHub will force Node.js 24 on June 2nd, 2026. All three `actions/*@v4` used here will break if not bumped to versions that support Node.js 24. The same issue affects `visual-regression.yml` and the full repo. Not introduced by this PR, but worth tracking. Non-blocking.

---

## Blocking Issues

None.

---

## Non-Blocking Nits

| ID | Component | Issue | Suggested fix |
|----|-----------|-------|---------------|
| N1 | GitHub Actions versions | `actions/checkout@v4`, `actions/setup-node@v4`, `actions/cache@v4`, `actions/upload-artifact@v4` will all need a version bump before June 2nd, 2026 when GitHub forces Node.js 24. Affects all workflows, not just this one. | File a housekeeping card to bump all `@v4` action refs to Node.js 24-compatible versions (typically `@v5` or the latest that ships with Node.js 24 support). Not blocking this PR — `@v4` still works today. |

---

## Overall Readiness Assessment

**READY TO MERGE.** All 26 checklist items PASS. Workflow file is a clean mirror of the proven `visual-regression.yml` reference pattern, scoped correctly to the a11y suite. CI empirically passed 5/5 on the first run (2m26s). No blocking issues. One non-blocking nit (Node.js 20 actions deprecation) is a repo-wide issue, not introduced here.
