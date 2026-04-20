# LKID-80 Visual-Regression Snapshot Refresh — BLOCKED

**Owner:** Harshit
**Date:** 2026-04-20
**Parent PR:** #59 (LKID-80 chart redesign, merged at `8bca0e9`)
**Parent verdict:** `agents/yuri/drafts/sprint5-pr59-qa-verdict.md` (nit #1)
**Branch created:** `fix/LKID-80-visual-snapshot-refresh` (local only — not pushed, no PR opened)

---

## Dispatch premise vs. reality

The dispatch asked me to refresh stale Playwright visual-regression baselines for the chart after the LKID-80 redesign. On inspection, the premise doesn't hold:

| Dispatch assumption | Actual state |
|---|---|
| Baselines are stale and will fail next CI run | **No baselines have ever been committed.** `app/tests/visual/snapshots/` does not exist on main. |
| `@playwright/test` may need installing | Confirmed absent — not in `app/package.json` and not in `app/node_modules`. Yuri flagged this in PR #57 nit #4, PR #58 nit #6, and again in PR #59 Check #16. |
| CI will fail until refreshed | **No CI job runs the visual-regression suite.** `.github/workflows/` contains only `post-deploy-smoke.yml` (curl-based, runs after main push + every 6 hours). There is no Playwright job on PRs or on main. Nothing is or will be failing. |

So this is not a "refresh" — it would be **initial baseline generation**, which is what Yuri actually recommended in PR #59 nit #1.

## Why I'm not generating baselines in this PR

Reading `app/tests/visual/chart-regression.spec.ts` against the current app state reveals the spec was written against the pre-tokenized flow and is now structurally broken:

### 1. `/results` no longer exists

The spec calls `await page.goto("/results")` in all four tests (lines 179, 192, 202, 216). After LKID-66 deleted the legacy Clerk-gated flow (merged in PR #47 — `c5e59a9 refactor(app): delete legacy /predict /auth /results pages`), the only surviving route is `/results/[token]`.

Confirmed on disk:
```
app/src/app/results/
└── [token]/
    └── page.tsx
```

A bare `/results` hit will 404. `waitForChartStable()` will then time out waiting for `svg`, tests will fail, no snapshots will be generated — or worse, the 404 page's "not found" chrome will be captured as a baseline.

### 2. Mock intercept uses the wrong endpoint

`mockPredictResponse()` intercepts `**/predict` (line 65). The current tokenized flow is:

- Frontend POSTs to `/api/predict` (a Next.js API proxy, added in PR #42)
- Next.js proxies to Railway `POST /predict`
- Response includes a `report_token`
- Client then redirects to `/gate/[token]`
- After email capture, `/results/[token]` is loaded, which fetches `GET /results/{token}` from the backend (not `/predict`)

The spec's single-endpoint mock predates this topology. To make the spec work we'd need to:
- Intercept either the Next API proxy or `/results/{token}` (or both)
- Provide a synthetic token and navigate directly to `/results/[synthetic-token]`
- Ensure the server-side fetch for the token's data can be stubbed (currently the page component fetches on the server in a RSC, which Playwright's `page.route` doesn't intercept — this is a fundamental Next.js 16 RSC vs. Playwright route-interception problem that needs a design decision from Yuri)

That's a rewrite of the test spec, not a snapshot refresh.

### 3. Explicit TODO in the file

Line 20–22 of the spec reads:

```ts
* TODO (Harshit): Wire up MSW or route interception to inject specific
* prediction responses so chart renders are deterministic across runs.
```

The test was authored stub-style during Sprint 3 (LKID-48) with a note that the data-injection plumbing was left for later. That plumbing never happened — confirmed by the absence of any MSW imports in `chart-regression.spec.ts`, no Playwright install, and no baselines. Generating snapshots now against a broken `page.goto` would just commit garbage.

## Dispatch constraints I'd violate if I proceed

The dispatch says:
> Do NOT modify any non-snapshot file. This PR is purely `.png` binary updates + maybe `.ts` spec file if the snapshot names changed.

Getting this suite to produce meaningful baselines requires:

1. Installing `@playwright/test` + running `npx playwright install chromium` → modifies `package.json`, `package-lock.json`, and adds 300+ MB of browser binaries (not committed, but the install step still mutates lockfile)
2. Rewriting `mockPredictResponse()` to match the tokenized API shape
3. Rewriting `page.goto` calls to navigate through the real tokenized flow or to a seeded `/results/[token]` URL
4. Designing a token-mocking strategy that works with Next.js 16 RSCs (server-side fetches)
5. Possibly adding a test-only API stub page (e.g., `/results/test-token-1`) or an MSW Node-side integration

None of that is a snapshot-file change. It's a test-spec redesign and a package.json change — explicitly out of scope per the dispatch.

## What Brad would need to run manually (or what the next dispatch needs to cover)

If the team wants this suite operational, the correct sequence is roughly:

```bash
# 1. Install Playwright + Chromium only (keeps CI install <200MB)
cd app
npm install --save-dev @playwright/test
npx playwright install chromium

# 2. Rewrite the spec for the tokenized flow (NEW WORK — needs Yuri + Harshit pairing)
#    - Replace page.goto("/results") with tokenized-flow nav or seeded /results/[token]
#    - Mock /api/predict (Next proxy) OR the backend /results/{token} GET
#    - Decide how to handle server-side RSC fetches in Playwright (MSW Node? test-only backend?
#      Railway QA env? synthetic token baked into the backend?)

# 3. Generate initial baselines
cd app
npx playwright test --config=playwright.visual.config.ts --update-snapshots --project=chromium-visual
#    (Chromium-only first; firefox/webkit add cross-browser sub-pixel variance — keep to one until stable)

# 4. Wire the suite into CI
#    - Add a new .github/workflows/visual-regression.yml that runs on PR
#    - Cache the Chromium browser between runs (actions/cache)
#    - Fail fast — no retries on main
```

## What I did not do and will not do without a re-scope

- Did not push the branch `fix/LKID-80-visual-snapshot-refresh`
- Did not open a PR (no meaningful artifact to commit — snapshots can't be generated against the broken spec)
- Did not install `@playwright/test` (would mutate `package.json` out of scope)
- Did not modify `chart-regression.spec.ts` (explicitly forbidden by dispatch)
- Did not commit anything to the branch

The branch exists locally only. It can be deleted with:
```bash
git checkout main && git branch -D fix/LKID-80-visual-snapshot-refresh
```

## Recommendation

Spin a new Sprint 5 follow-up card (e.g., `LKID-81 — Visual-regression baseline generation + CI wiring post-LKID-80`) with these explicit acceptance criteria:

1. Install `@playwright/test` + Chromium browser in the `app/` package
2. Rewrite `chart-regression.spec.ts` to navigate through the tokenized `/results/[token]` flow (either via seeded token or Playwright route intercept of both `/api/predict` and `/results/{token}`)
3. Generate initial Chromium-only baselines showing: green gradient fill under BUN ≤12, dialysis threshold tinted band + dashed line + "Level where dialysis may be needed" label, end-point callouts on green and gray lines, dynamic y-axis ticks
4. Add `.github/workflows/visual-regression.yml` that runs on PR with Chromium cached, no retries on main, HTML report on failure
5. Update `app/tests/visual/README.md` with the tokenized-flow mocking strategy
6. Owner: Harshit + Yuri pairing (per the Sprint 3 LKID-49 pattern)

This is properly 1–2 days of work, not a <15-min snapshot refresh.
