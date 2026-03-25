# Lean Launch Profile — QA Review

**Author:** Yuri (QA Engineer)
**Date:** 2026-03-25
**Status:** DECISION RENDERED

---

## Decision: Revised test strategy is ACCEPTABLE with three non-negotiable additions

The CEO Test correctly identified that my original strategy was built for a
patient portal, not a lead gen MVP. I am dropping 90%/85% coverage thresholds,
Schemathesis, visual regression, k6 load testing, and the 5-gate sprint
process. That is the right call for ~20 tickets across 2 sprints.

### What I accept as-is

- No coverage thresholds enforced in CI
- No Schemathesis (only 1 real endpoint to test — `/predict`)
- No visual regression (chart will change rapidly)
- No k6 load testing (provider-level rate limiting is sufficient at launch scale)
- No 5 QA gates per sprint (replaced by a single pre-release gate)

### Three non-negotiables I am adding back

**1. Prediction engine unit tests must be exhaustive, not just "thorough."**
This is the IP. I require: boundary-value tests for all 4 input fields (BUN,
creatinine, potassium, age), verification of all 4 trajectory line outputs,
edge cases (zero, negative, clinically impossible values), and a golden-file
test with known input/output pairs. If the prediction is wrong, the product
is worthless. No PR merges to `/predict` without passing these.

**2. One E2E happy path AND one E2E error path.**
The lean profile says "critical path E2E" but does not specify error handling.
I require two Playwright tests: (a) form -> predict -> chart renders -> PDF
downloads, and (b) form with invalid values -> appropriate error messages
displayed. A lead gen tool that shows a blank screen on bad input loses the
lead.

**3. axe-core runs on every page, not just "basic."**
The target demographic is 60+ CKD patients. Accessibility failures are not
cosmetic — they block real users. I require zero critical/serious axe-core
violations on the form page, chart page, and PDF download flow. This costs
3 lines of config in Playwright. There is no reason to cut it.

---

## Quality risks the team should know about

| Risk | Severity | Mitigation |
|------|----------|------------|
| No auth testing — managed provider handles it, but misconfigured Clerk/Supabase could leak the bot gate | Medium | Manual smoke test of magic link flow before each release |
| No integration test between frontend and `/predict` API | Medium | The E2E happy path covers this implicitly; if it breaks, E2E fails |
| PDF generation is untested beyond E2E download check | Low | Acceptable for MVP; add PDF content assertions in Phase 2 |
| No monitoring/alerting — silent failures in production | Medium | CTO should add basic uptime check (e.g., `/health` ping) at minimum |
| Single confidence level may produce misleading trajectories for edge-case inputs | High | Prediction engine golden-file tests must include edge cases; add disclaimer copy review to pre-release gate |

---

## Revised QA process for lean launch

**Pre-release gate (single gate, replaces 5):**
1. All prediction engine unit tests pass
2. Both E2E tests pass (happy path + error path)
3. Zero critical/serious axe-core violations
4. Manual smoke: magic link flow works end-to-end
5. Manual smoke: PDF opens and contains chart

If all 5 items pass, I sign off. No other gates needed for a 2-sprint MVP.

---

**Bottom line:** The lean profile is sound. My three additions cost less than
one day of engineering effort and prevent the most likely launch failures.
Ship it.
