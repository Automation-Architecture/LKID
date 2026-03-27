# QA Testing SOP

**Author:** Luca (CTO / Orchestrator)
**Date:** 2026-03-27
**Audience:** Yuri (QA Engineer) — primary operator of this SOP
**Status:** ACTIVE — binding process for all QA activities

---

## Purpose

This document governs how Yuri performs QA work on the KidneyHood project. It codifies skill invocation rules, task-specific workflows, gate criteria, reporting standards, escalation paths, and CI integration.

**Technical foundation:** `agents/yuri/drafts/test_strategy.md` — the test pyramid, frameworks, coverage thresholds, and E2E journeys defined there remain the authoritative technical reference. This SOP governs *process*; the test strategy governs *what and how*.

**Skill assignment rationale:** `agents/luca/drafts/qa-skills-recommendations.md` — explains why each skill was assigned to Yuri and at which tier.

---

## 1. Skill Invocation Rules

These rules are mandatory. Invoke the specified skill BEFORE starting work on the matching task type. No exceptions.

### Tier 1 — Always Invoke

| Task Type | Skill | Non-Negotiable |
|-----------|-------|----------------|
| Writing or reviewing **pytest** tests (backend unit, integration, fixtures, async) | `/python-testing-patterns` | Yes |
| Writing or reviewing **Vitest / RTL** tests (frontend unit, component) | `/javascript-testing-patterns` | Yes |
| Writing, debugging, or maintaining **Playwright E2E** tests | `/e2e-testing-patterns` | Yes |
| Investigating any **bug, test failure, or unexpected behavior** | `/systematic-debugging` | Yes |
| **Screen reader testing** or manual **accessibility audits** | `/agent-browser` | Yes |
| **Smoke-testing** a PR in a local running app | `/webapp-testing` + `/agent-browser` | Yes |

**Critical:** Use `/agent-browser` for ALL browser-based testing and automation. Never use Playwright MCP directly. The agent-browser skill is the only approved method for driving a browser.

### Tier 2 — Invoke When Applicable

| Task Type | Skill | When |
|-----------|-------|------|
| About to **sign off** on a QA report or claim a gate is passed | `/verification-before-completion` | Before any final assertion that work is done, a gate passes, or a report is complete. Evidence before assertions. |

### Tier 3 — Use Judgment

| Task Type | Skill | When |
|-----------|-------|------|
| Running a **large QA pass** across multiple PRs or an entire sprint | `/subagent-verification-loops` | When the scope is broad enough that parallel sub-reviewers would catch things a single pass would miss. |
| **Reviewing PR code** for testability or correctness patterns | `/code-review-excellence` | When reviewing another agent's implementation for test gaps, not for routine QA report writing. |

### Explicitly Excluded

These skills are NOT part of Yuri's workflow. Do not invoke them.

| Skill | Reason |
|-------|--------|
| `/frontend-code-review` | Yuri reviews for functional correctness, not code style or architecture. |
| `/test-driven-development` | TDD is for developers writing feature code. Yuri tests after features exist. |
| `/frontend-testing` | Overlaps with `/javascript-testing-patterns`. The JS testing skill covers the same Vitest + RTL patterns. |

---

## 2. QA Workflow Per Task Type

### 2a. Writing New Test Suites

**Applies to:** Unit tests (pytest or Vitest/RTL), integration tests, E2E tests.

1. **Invoke the matching Tier 1 skill** before writing any test code.
2. **Review the relevant acceptance criteria** on the Jira card. If AC is missing or untestable, send it back to Husser before writing tests.
3. **For prediction accuracy tests:** Confirm that validated test vectors from Lee are available (Decision #13). If vectors are not available, write structural tests only (response shape, status codes, tier assignment logic) and document that accuracy validation is blocked. Do not invent expected eGFR/UACR output values — they must come from Lee's clinically validated vectors.
4. **Check the test strategy** (`agents/yuri/drafts/test_strategy.md`) for coverage thresholds, framework versions, and data strategy applicable to the test layer.
5. **Write tests following the test pyramid distribution:** 60% unit, 30% integration, 10% E2E. Do not write E2E tests for things that can be caught at the unit or integration layer.
6. **Use synthetic data only.** No real patient data. Reference the test data strategy in the test strategy Section 9c.
7. **Include axe-core accessibility scans** in every frontend component test. This is not optional for a 60+ patient demographic.
8. **Run the full test suite locally** before committing. Do not push failing tests.
9. **Post coverage numbers** in the PR description or comment.

### 2b. QA Reports on PRs

**Applies to:** Any PR that Yuri is reviewing.

1. **Invoke `/webapp-testing` + `/agent-browser`** to smoke-test the PR in the running app (if applicable).
2. **Invoke `/systematic-debugging`** if any unexpected behavior is found during review.
3. **Read the full diff.** Check every changed file, not just the ones in the PR description.
4. **Cross-check against contracts.** If the PR touches API endpoints, verify response shapes match `api_contract.json`. If it touches DB queries, verify against `db_schema.sql`.
5. **Check for cross-boundary misalignment.** The age max 100/120 mismatch is the canonical example — frontend, backend, and DB must agree on validation ranges. Always check that a change in one layer is reflected in the others.
6. **Write findings using the reporting format** defined in Section 4 below.
7. **Before signing off, invoke `/verification-before-completion`.** Run the tests, confirm the evidence, then report.

### 2c. Sprint-Level QA Passes

**Applies to:** End-of-sprint comprehensive QA.

1. **Consider invoking `/subagent-verification-loops`** (Tier 3) to parallelize the review across different areas (frontend, backend, infrastructure, accessibility).
2. **Walk every QA gate** (Section 3) for the sprint. Document the status of each gate.
3. **Run the full regression suite.** All unit, integration, contract, and E2E tests.
4. **Perform manual exploratory testing.** Document what you explored and what you found.
5. **Run a date consistency audit.** Check that sprint dates, ship dates, and version numbers are consistent across all shipped files. (Yuri's Sprint 2 QA Report #2 demonstrated this well — it is now standard practice.)
6. **Produce a sprint QA report** following the format in Section 4.

### 2d. Accessibility Audits

**Applies to:** Any accessibility review, whether triggered by a gate, a PR, or a standalone audit.

1. **Invoke `/agent-browser`** for all browser-based accessibility testing. Never use Playwright MCP.
2. **Run axe-core automated scans first.** axe-core catches approximately 60% of WCAG 2.1 AA violations. Document all critical and serious findings.
3. **Perform manual screen reader testing** for the remaining 40%. Use VoiceOver (macOS). Focus on:
   - Chart data (Visx SVG) conveyed to screen readers
   - Form field labels and error announcements
   - Keyboard navigation through the full prediction flow
   - Touch targets on mobile viewports (minimum 44x44px)
   - Font sizes on mobile (minimum 16px to prevent iOS auto-zoom)
4. **Test at key breakpoints:** 375px (mobile), 768px (tablet), 1024px+ (desktop). The disclaimer switches from sticky footer (mobile) to inline (desktop) — verify the transition.
5. **Document findings with severity levels.** Critical/serious violations are release-blocking per the test strategy.

### 2e. Bug Investigation and Regression Testing

**Applies to:** Any reported bug or test failure.

1. **Invoke `/systematic-debugging`** immediately. Structure the investigation before proposing fixes.
2. **Reproduce the bug.** Document the exact steps, input values, and environment.
3. **Trace across boundaries.** Most bugs in this project cross frontend/backend/DB lines. Check all three layers.
4. **Identify root cause.** Do not just describe the symptom. The QA report must state what is wrong, where, and why.
5. **Write a regression test** that reproduces the bug (fails before fix, passes after fix). This test is added to the permanent suite.
6. **The owning agent fixes the bug.** Yuri flags it and writes the regression test. Yuri does NOT write application code.
7. **Verify the fix** by running the regression test and the surrounding test suite.

### 2f. Contract Testing (Schemathesis)

**Applies to:** Gate 1 (Contract Lock), any PR that modifies API endpoints or OpenAPI spec.

1. **Pull the latest OpenAPI spec** from `agents/john_donaldson/drafts/api_contract.json` (or the published artifact in the backend repo).
2. **Invoke `/python-testing-patterns`** — Schemathesis is Python-based and uses pytest as its runner.
3. **Run Schemathesis against the mock server** first:
   ```bash
   schemathesis run --base-url http://localhost:8000 api_contract.json --checks all
   ```
4. **Run against the live staging API** (Gate 3 and beyond):
   ```bash
   schemathesis run --base-url https://staging.kidneyhood.com api_contract.json --checks all
   ```
5. **Cross-reference Schemathesis failures with MSW mocks.** If Schemathesis finds a schema mismatch, check whether Harshit's MSW handlers have the same mismatch. File both as a single finding if so — one root cause, one fix.
6. **File contract mismatches as blocking issues against John Donaldson** with the endpoint path, HTTP method, expected schema, and actual response body.
7. **Re-run after fixes** to confirm resolution before signing off on Gate 1.

### 2g. Visual Regression Testing

**Applies to:** Gate 2 (baseline establishment), Gate 4 (no unexpected changes), any PR that modifies chart components or Visx rendering.

1. **Invoke `/e2e-testing-patterns`** — visual regression uses Playwright screenshot comparison.
2. **Run the visual regression suite:**
   ```bash
   npx playwright test --project=visual-regression
   ```
3. **Review pixel diffs.** Open the Playwright HTML report and inspect every flagged screenshot.
4. **Classify each diff:**
   - **Regression** — unintended visual change. File as a finding with the screenshot diff attached.
   - **Intentional change** — update the baseline. Create a dedicated PR with the new baseline screenshot. Yuri approves baselines he generates; Luca approves baselines generated by other agents.
5. **SVG-specific considerations:** Visx renders SVG elements that can shift by sub-pixel amounts due to font rendering differences across Chromium, Firefox, and WebKit. Run the visual regression suite across all three engines. Document per-test threshold exceptions for charts with dynamic data.
6. **Wait for chart stabilization.** Before capturing screenshots, ensure the Visx chart has finished rendering (all data loaded, animations complete, no pending React state updates). Coordinate with Harshit if the rendering lifecycle is unclear.
7. **Baseline storage:** `/tests/visual-baselines/`. Never commit baseline updates in the same PR as feature code.
8. **Threshold:** Pixel diff tolerance is configured in `playwright.config.ts`. Default: 0.1% of pixels. Charts with dynamic data may require higher tolerance — document exceptions per test with a comment explaining why.

### 2h. Task Intake

**Applies to:** All QA work. This workflow governs how Yuri receives and triages tasks.

Yuri receives QA work through three channels:

1. **PR review assignment** — Luca or the PR author assigns Yuri as a reviewer on GitHub. Yuri checks GitHub notifications or the PR queue daily. A PR is ready for QA only when the author has marked it as "Ready for Review" (not draft) and the Jira card is in "In Review" status.
2. **Gate checkpoint** — Triggered by sprint cadence (see gate timing in Section 3). Yuri proactively checks whether gate preconditions are met and initiates the gate review without waiting to be asked.
3. **Bug reports** — Filed as Jira issues with label `bug` and assigned to Yuri for investigation. Follow Workflow 2e (Bug Investigation).

**Triage rules:**
- If a task arrives without sufficient context (e.g., a PR with no description, a bug report with no reproduction steps), send it back to the originator before starting work.
- Gate checkpoints take priority over PR reviews. Bug investigation takes priority over both if severity is HIGH.
- When multiple PRs are ready for QA simultaneously, review them in Jira card order (lowest card number first) unless Luca specifies a different priority.

---

## 3. QA Gate Criteria

Every sprint has 5 gates. Each gate is blocking — work cannot advance without Yuri's explicit approval on the Jira card or PR. These gates are derived from the test strategy Section 4 (formerly 10c) and are now binding process.

### Gate 0: Spec Review

**When:** Before sprint starts.
**Criteria:**
- [ ] Every sprint story has testable acceptance criteria (Given/When/Then)
- [ ] Spec gaps are resolved or explicitly deferred with documented rationale
- [ ] Story dependencies are captured as Jira issue links
- [ ] Validation ranges and error messages are documented for all input fields
**Fail action:** Stories without testable AC are returned to Husser. Sprint does not start until Gate 0 passes.

### Gate 1: Contract Lock

**When:** After John publishes the API contract for sprint endpoints.
**Criteria:**
- [ ] Schemathesis contract tests pass against mock server for all sprint endpoints
- [ ] Error envelope `{error: {code, message, details[]}}` is consistent across all endpoints
- [ ] Request/response schemas match the OpenAPI spec exactly
- [ ] MSW mock handlers (Harshit's) are aligned with the published contract
**Fail action:** Frontend and backend cannot begin integration until contract tests pass.

### Gate 2: Component Review

**When:** After frontend components are built, before integration.
**Criteria:**
- [ ] Unit tests pass for all new/modified components
- [ ] Vitest coverage meets 85% threshold for the sprint's component scope
- [ ] axe-core scan returns 0 critical/serious violations on all components
- [ ] `data-testid` attributes are present on all interactive elements
- [ ] Visual regression baselines are established for chart components (Visx/SVG)
**Fail action:** Components with failing tests or accessibility violations are not approved for integration.

### Gate 3: Integration

**When:** After frontend-backend integration is complete.
**Criteria:**
- [ ] Integration tests pass (frontend TanStack Query mutations against live FastAPI)
- [ ] E2E critical path tests pass for all journeys affected by the sprint
- [ ] Contract tests pass against the live staging API (not just mocks)
- [ ] Backend coverage meets 90% threshold for sprint scope
**Fail action:** Integration failures block the sprint from advancing to pre-release.

### Gate 4: Pre-Release

**When:** Before any deployment to production or staging.
**Criteria:**
- [ ] Full regression suite passes (unit, integration, contract, E2E)
- [ ] HIPAA checklist is 100% verified for the sprint's scope
- [ ] Manual exploratory testing completed and documented
- [ ] Visual regression baselines have no unexpected changes
- [ ] Performance benchmarks met (if applicable)
- [ ] Disclaimers are verbatim and visible on all viewports
- [ ] Error responses match the approved envelope format
**Fail action:** No deployment without Gate 4 approval.

### Blocking Conditions (Any Gate)

A build is blocked if ANY of the following are true:
- Any unit test fails
- Any contract test fails
- Any E2E critical path test fails
- Coverage drops below threshold (90% backend, 85% frontend)
- Any critical/serious accessibility violation exists
- Any HIPAA checklist item is unverified
- Disclaimers are missing or modified from required verbatim text

---

## 4. Reporting Standards

All QA reports follow this structure. Use Yuri's Sprint 2 QA Report #2 (`agents/yuri/drafts/sprint2-qa-report-2.md`) as the template.

### Report Header

```markdown
# [Report Title] — [Scope Description]

**Reviewer:** Yuri (QA)
**Date:** YYYY-MM-DD
**Branch:** `branch-name` (context)
**Scope:** What was reviewed
```

### Executive Summary

One paragraph. State the verdict first: **PASS**, **PASS WITH CONDITIONS**, or **FAIL**. Then summarize the key findings in 2-3 sentences.

Follow with a summary table:

```markdown
| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| [Area Name] | N | N | N | N |
| **Totals** | **N** | **N** | **N** | **N** |
```

### Findings Sections

Group findings by functional area (e.g., "Report #1 Fix Verification", "Dashboard Polish", "Clerk Auth Scaffold"). Within each area:

- **Each finding gets an ID** (e.g., FV-01, DP-02, CK-03). IDs are area-prefix + sequential number.
- **State the verdict first:** PASS, FAIL, or NOTE. Include severity in brackets for non-pass items: `[HIGH]`, `[MEDIUM]`, `[LOW]`.
- **Cite specific file paths and line numbers.** Not "the validation file" but "`app/src/lib/validation.ts` line 19".
- **For failures, include the fix.** State what needs to change, in which file, and what the correct value or behavior should be. The owning agent should be able to fix it from the report alone.

### Failure Summary

At the end, consolidate all failures and notes into severity-grouped tables:

```markdown
## Failure Summary

### HIGH Severity (N)
| ID | Component | Issue | Fix |
|----|-----------|-------|-----|

### MEDIUM Severity (N)
| ID | Component | Issue | Fix |
|----|-----------|-------|-----|

### LOW Severity / Notes (N)
| ID | Component | Issue |
|----|-----------|-------|
```

### Overall Readiness Assessment

End with a per-area readiness call: READY, READY (with conditions), or NOT READY. State the conditions or blockers explicitly.

### Depth Requirements

- **PR-level reports:** Check every changed file. Cross-reference against contracts, schemas, and adjacent components.
- **Sprint-level reports:** Walk every gate. Run the full regression suite. Include a date consistency audit. Perform manual exploratory testing.
- **Fix verification reports:** Re-check every finding from the previous report. State whether each is FIXED, NOT FIXED, or PARTIALLY FIXED.

---

## 5. Skill Escalation Path

Skill escalation follows the tier structure. Start at Tier 1. Escalate to higher tiers based on scope and complexity.

### When to Stay at Tier 1

- Single PR review
- Writing tests for a single Jira card
- Investigating a single bug
- Running a focused accessibility audit on one component or page

Tier 1 skills (python-testing-patterns, javascript-testing-patterns, e2e-testing-patterns, systematic-debugging, agent-browser) are sufficient. No escalation needed.

### When to Add Tier 2

- **Signing off on any QA report or gate.** Always invoke `/verification-before-completion` before claiming a gate passes or a report is final. This is the "evidence before assertions" rule.
- **Smoke-testing a PR in the browser.** Invoke `/webapp-testing` alongside `/agent-browser` when the PR includes visible UI changes that need interactive verification.

### When to Escalate to Tier 3

- **Sprint-level QA pass across 3+ PRs.** Invoke `/subagent-verification-loops` to spawn parallel sub-reviewers. One sub-reviewer per area (frontend, backend, infrastructure, accessibility). Each produces findings independently; Yuri synthesizes into the final report.
- **Reviewing a PR for testability gaps in unfamiliar code.** Invoke `/code-review-excellence` when reviewing another agent's implementation and the code is complex enough that a structured review checklist would catch things a casual read would miss.

### Escalation Decision Matrix

| Scope | PR Count | Tier 1 | + Tier 2 | + Tier 3 |
|-------|----------|--------|----------|----------|
| Single bug investigation | 0-1 | Yes | If signing off | No |
| Single PR review | 1 | Yes | Yes (sign-off) | Rarely |
| Multi-PR review | 2-3 | Yes | Yes | Consider subagent loops |
| Sprint QA pass | All sprint PRs | Yes | Yes | Yes (subagent loops) |
| Release gate | N/A | Yes | Yes | Yes (if broad scope) |

---

## 6. Ongoing QA Activities

These workflows cover recurring QA responsibilities that are not triggered by a specific PR or gate but are essential for sustained quality.

### 6a. Security and HIPAA Verification

**Applies to:** Gate 4 (Pre-Release), any sprint where infrastructure changes are deployed. Run at least once per sprint.

**Precondition:** Staging environment must be deployed on Railway with production-equivalent security controls. Coordinate with Luca (infrastructure) and Gay Mark (database) before starting.

1. **Encryption at rest:** Verify PostgreSQL disk encryption is enabled on Railway. Check via Railway dashboard or CLI (`railway variables` to confirm no plaintext PHI in env vars). Document the encryption method (AES-256 expected).
2. **Encryption in transit:** Confirm TLS is enforced on all connections:
   - Frontend to backend: verify HTTPS on the API domain. Check certificate validity and grade (use `curl -vI https://staging.kidneyhood.com`).
   - Backend to database: verify `sslmode=require` or `sslmode=verify-full` in the DATABASE_URL connection string.
3. **Audit logging:** Coordinate with Gay Mark to verify `pgaudit` is installed and configured. Confirm that all INSERT, UPDATE, and DELETE operations on PHI tables (`patients`, `lab_entries`, `predictions`) are logged. Query the audit log to verify entries exist for recent test operations.
4. **RBAC verification:** Confirm that the database user used by the FastAPI application has only the minimum required permissions (SELECT, INSERT, UPDATE on application tables; no DROP, ALTER, or superuser privileges).
5. **Guest session data handling:** Verify that guest session data is purged according to the retention policy. Check that no PHI persists after session expiry.
6. **Environment variable security:** Confirm that secrets (DATABASE_URL, CLERK_SECRET_KEY, API keys) are stored in Railway's encrypted environment variables, not in code or config files.
7. **Document findings** using the standard reporting format (Section 4). Each HIPAA item is a finding with PASS/FAIL status. Any FAIL is release-blocking.

### 6b. Contract Alignment Audit

**Applies to:** End of every sprint. This is a systematic cross-boundary consistency check, not a PR-level review.

1. **Collect the authoritative sources:**
   - API contract: `agents/john_donaldson/drafts/api_contract.json`
   - DB schema: `agents/gay_mark/drafts/db_schema.sql` (and current Alembic head migration)
   - Frontend validation: `app/src/lib/validation.ts` (or equivalent)
   - Backend validation: Pydantic models in `backend/`
2. **Compare validation ranges** across all four sources. For every input field (age, eGFR, creatinine, UACR, etc.), verify that min/max values, required/optional status, and data types are identical. The age 100/120 mismatch pattern is the canonical example — check for this class of divergence on every field.
3. **Compare field names and types.** Confirm that JSON field names in the API contract match database column names (or have documented mapping). Verify enum values are consistent (e.g., CKD stage values, confidence tiers).
4. **Compare error codes and messages.** Verify that error codes returned by the backend match those documented in the API contract and handled by the frontend.
5. **Document all mismatches** as findings in the sprint QA report. Each mismatch is filed against the agent responsible for the divergent source.
6. **Track resolution.** Mismatches from previous sprints that remain unfixed are escalated to Luca.

### 6c. Regression Suite Maintenance

**Applies to:** Ongoing. Review the regression suite at least once per sprint.

1. **Identify flaky tests.** Review CI run history for tests that intermittently fail. Investigate root cause — timing issues, test ordering dependencies, or non-deterministic data. Fix or quarantine flaky tests with a documented reason and a Jira card to resolve.
2. **Prune obsolete tests.** When features are removed or significantly refactored, remove or update tests that no longer exercise valid code paths. Dead tests create false confidence.
3. **Update fixtures when schemas change.** After any Alembic migration, verify that all test fixtures (Python and TypeScript) produce valid data against the new schema. If a required field was added, every fixture that omits it must be updated.
4. **Review coverage gaps.** Compare current coverage reports against the test strategy's targets (90% backend, 85% frontend). Identify areas where coverage has regressed and write tests to close the gap.
5. **Refactor test utilities.** Consolidate duplicate test setup code into shared fixtures or factory functions. Keep the test codebase as maintainable as the application codebase.

### 6d. Test Environment Setup and Teardown

**Applies to:** Any QA work that requires a running local environment (smoke testing, E2E, contract testing against live APIs).

1. **Start the full stack locally:**
   - **Backend:** `cd backend && uvicorn main:app --reload` (or the project's start script). Confirm health check at `http://localhost:8000/health`.
   - **Database:** Ensure PostgreSQL is running (local install or Docker). Run `alembic upgrade head` to apply migrations. Run `python seeds/seed.py` if seed data is needed.
   - **Frontend:** `cd app && npm run dev`. Confirm the app loads at `http://localhost:3000`.
2. **Verify service connectivity.** Hit the frontend, trigger an API call (e.g., submit the lab entry form), and confirm the response flows through backend to database and back.
3. **Use synthetic data only.** Seed the database with test fixtures, never real patient data.
4. **Teardown after testing.** Drop and recreate the test database (or use a dedicated test database) to ensure no test data leaks between sessions. Do not leave stale data that could affect the next test run.
5. **Document any environment issues.** If setup fails or requires workarounds (e.g., a missing env var, a port conflict), document the issue and notify the responsible agent.

---

## 7. Integration with CI

QA outputs feed directly into the GitHub Actions pipeline. The pipeline enforces the same standards defined in this SOP automatically.

### Pipeline Stages

The CI pipeline runs on every PR, in this order:

```
lint -> unit tests -> integration tests -> contract tests -> E2E tests -> accessibility scan -> coverage report
```

PRs that fail any stage are blocked from merging. No overrides without Yuri's explicit approval.

### What Each Stage Produces

| Stage | Tool | Output | Threshold |
|-------|------|--------|-----------|
| Backend unit tests | pytest + coverage.py | Coverage report | 90% line coverage (`--fail-under=90`) |
| Frontend unit tests | Vitest + c8 | Coverage report | 85% line coverage (Vitest threshold config) |
| Contract tests | Schemathesis | Pass/fail per endpoint+method+status | 100% of documented endpoints |
| E2E tests | Playwright | Pass/fail per journey | 100% of 8 active journeys |
| Accessibility scan | @axe-core/playwright | Violation report | 0 critical/serious violations |
| Coverage report | Istanbul (c8) / coverage.py | PR comment with coverage diff | Must not decrease |

### PR Comment Automation

Coverage reports and accessibility scan results are posted as PR comments automatically. This gives every reviewer (Yuri, Copilot, CodeRabbit) visibility into test health without leaving the PR.

### Nightly Runs

The following run nightly, not on every PR (to avoid CI bottlenecks):

- **Full visual regression suite** — Playwright screenshot comparison against stored baselines. Any baseline change requires a PR with Yuri's approval.
- **Load/performance tests** — k6 against staging API. Target: POST /predict < 2s p95 at 100 concurrent users.
- **Contract tests against live staging API** — validates that deployed backend matches the OpenAPI spec (not just mocks).

### How Yuri's Reports Connect to CI

1. **Gate 1 (Contract Lock):** Yuri confirms Schemathesis CI stage passes. If it fails, Yuri files the contract mismatch as a blocking issue against John Donaldson.
2. **Gate 2 (Component Review):** Yuri reviews the Vitest coverage PR comment and the axe-core scan results. If coverage is below 85% or violations exist, the PR is blocked.
3. **Gate 3 (Integration):** Yuri confirms the full E2E stage passes in CI. If any critical journey fails, Yuri opens a blocking issue with reproduction steps.
4. **Gate 4 (Pre-Release):** Yuri reviews the nightly run results (visual regression, load tests, staging contract tests) in addition to the per-PR CI results. All must be green.

### Visual Regression Baseline Management

- Baselines are stored in `/tests/visual-baselines/`.
- Baselines assume linear time x-axis and SVG output from Visx.
- Any baseline update requires a dedicated PR reviewed and approved by Yuri.
- CI fails if screenshots diverge from baselines beyond the configured threshold.

---

## Appendix: Quick Reference Card

For Yuri's daily reference. Tear this off and pin it.

| Doing This? | Invoke This First |
|-------------|-------------------|
| Writing pytest tests | `/python-testing-patterns` |
| Writing Vitest/RTL tests | `/javascript-testing-patterns` |
| Writing Playwright E2E tests | `/e2e-testing-patterns` |
| Investigating a bug | `/systematic-debugging` |
| Browser testing or accessibility audit | `/agent-browser` (never Playwright MCP) |
| Smoke-testing a PR in browser | `/webapp-testing` + `/agent-browser` |
| Running Schemathesis contract tests | `/python-testing-patterns` |
| Running visual regression suite | `/e2e-testing-patterns` |
| Signing off on a report or gate | `/verification-before-completion` |
| Sprint-level QA pass (3+ PRs) | `/subagent-verification-loops` |
| Reviewing code for testability | `/code-review-excellence` |
| HIPAA/security verification | Coordinate with Luca + Gay Mark first |
| Contract alignment audit | Cross-reference all 4 sources (Section 6b) |
