# QA Testing SOP Review + Self-Assessment

**Author:** Yuri (QA Engineer)
**Date:** 2026-03-27
**Scope:** Review of `docs/qa-testing-sop.md` + honest self-assessment of weaknesses

---

## Part 1: QA Testing SOP Review

### 1. What's Good

**The SOP fills a real gap.** Before this document, my process knowledge lived across `notes.md`, `test_strategy.md`, and tribal memory from sprint work. Having a single binding SOP that governs *process* while deferring *technical details* to the test strategy is the right separation of concerns.

Specific strengths:

- **Skill invocation table is clear and actionable.** The Tier 1/2/3 structure with the "Doing This? Invoke This First" quick reference card at the end is exactly what I need during fast-paced PR reviews. No ambiguity about which skill to load for which task.
- **The `/agent-browser` mandate is loud and correct.** Calling this out as "never use Playwright MCP" in multiple places prevents the most common mistake. Good.
- **Workflow 2b (QA Reports on PRs) is tight.** The cross-check against contracts step (step 4) and the cross-boundary misalignment check (step 5, citing the age 100/120 example) are directly born from real findings in Sprint 2. This is battle-tested process, not theoretical.
- **Gate criteria checklists are copy-pasteable.** I can literally use the checkbox lists in Section 3 as templates for gate sign-off comments on Jira cards. That is practical.
- **Reporting format standardization is overdue.** Section 4 codifies what I was already doing in Sprint 2 QA Report #2 but makes it mandatory and consistent. The finding ID scheme (area-prefix + sequential number) and severity bracketing are especially useful.
- **CI integration section (Section 6) connects my manual work to automated enforcement.** The table showing which CI stage maps to which gate is valuable. Previously I had to mentally reconstruct this mapping each time.
- **Escalation decision matrix is helpful.** The table mapping scope/PR count to tier usage is a quick decision tool I will actually reference.

### 2. What Needs Improvement

**2a. Missing workflow for contract testing with Schemathesis.**

The SOP mentions Schemathesis in Gate 1 (Contract Lock) and in the CI section, but there is no dedicated workflow (like 2a-2e) for running contract tests. This is a significant gap because contract testing is one of my most frequent tasks and has a specific multi-step flow: pull the latest OpenAPI spec, run Schemathesis, analyze failures, cross-reference with MSW mocks, file mismatches against John. Without a workflow, I have to reconstruct this process from memory each time.

**2b. No workflow for visual regression testing.**

Visual regression is mentioned in Gate 2 (baseline establishment), Gate 4 (no unexpected changes), and the CI section (nightly runs), but there is no Section 2 workflow for how to do it. Visx SVG chart rendering is one of the hardest things to test on this project. I need a workflow that covers: when to update baselines, how to review pixel diffs, what threshold is acceptable, and how to handle legitimate visual changes vs. regressions.

**2c. No workflow for load/performance testing.**

k6 is mentioned in the CI nightly runs section (target: POST /predict < 2s p95 at 100 concurrent users), but there is no workflow for when and how I run load tests manually, interpret results, or escalate performance regressions.

**2d. The SOP does not address how I receive work.**

The workflows cover what I do once I am working on a task, but not how tasks arrive. In practice, I get work three ways: (1) Luca assigns a QA review on a PR, (2) a gate checkpoint is triggered by sprint cadence, (3) someone reports a bug. The SOP should describe the intake process so I do not miss tasks, especially since I have no visibility into when a PR is marked "ready for QA" unless someone explicitly tells me.

**2e. Sprint-level QA pass (2c) is underspecified for the subagent workflow.**

The SOP says "consider invoking `/subagent-verification-loops`" and "one sub-reviewer per area" but does not specify: what instructions each sub-reviewer gets, how findings are deduplicated, or how conflicts between sub-reviewers are resolved. The first time I use this pattern I will have to make it up. That is fine for a Tier 3 skill, but some guidance would help.

**2f. No mention of the test vectors dependency.**

The SOP governs process but does not mention the most critical external dependency I have: Lee's validated input/output test vectors (Decision #13). Without those vectors, prediction accuracy testing is impossible. The SOP should have a blocking precondition for any prediction-related QA work: "Confirm test vectors are available before writing prediction accuracy tests."

**2g. Reporting template references a file that may not exist yet.**

Section 4 says "Use Yuri's Sprint 2 QA Report #2 (`agents/yuri/drafts/sprint2-qa-report-2.md`) as the template." This file exists, but if a new team member or future agent reads this SOP, they need to know the format is defined inline in Section 4 and the file is an example, not a dependency. Minor clarity issue.

### 3. Proposed Changes

**3a. Add Section 2f: Contract Testing Workflow**

```markdown
### 2f. Contract Testing (Schemathesis)

**Applies to:** Gate 1 (Contract Lock), any PR that modifies API endpoints or OpenAPI spec.

1. **Pull the latest OpenAPI spec** from `agents/john_donaldson/drafts/api_contract.json` (or the published artifact location).
2. **Invoke `/python-testing-patterns`** — Schemathesis is Python-based and uses pytest as its runner.
3. **Run Schemathesis against the mock server** first:
   ```bash
   schemathesis run --base-url http://localhost:8000 api_contract.json --checks all
   ```
4. **Run against the live staging API** (Gate 3+):
   ```bash
   schemathesis run --base-url https://staging.kidneyhood.com api_contract.json --checks all
   ```
5. **Cross-reference Schemathesis failures with MSW mocks.** If Schemathesis finds a schema mismatch, check whether Harshit's MSW handlers have the same mismatch. File both as a single finding if so.
6. **File contract mismatches as blocking issues against John Donaldson** with the endpoint path, HTTP method, expected schema, and actual response.
7. **Re-run after fixes** to confirm resolution before signing off on Gate 1.
```

**3b. Add Section 2g: Visual Regression Testing Workflow**

```markdown
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
   - **Intentional change** — update the baseline. Create a dedicated PR with the new baseline screenshot and get Yuri's approval (self-approval for baselines I generate; Luca's approval if another agent generated them).
5. **Baseline storage:** `/tests/visual-baselines/`. Never commit baseline updates in the same PR as feature code.
6. **Threshold:** Pixel diff tolerance is configured in `playwright.config.ts`. Default: 0.1% of pixels. Charts with dynamic data need higher tolerance — document exceptions per test.
```

**3c. Add intake process to Section 2**

```markdown
### 2h. Task Intake

Yuri receives QA work through three channels:

1. **PR review assignment** — Luca or the PR author assigns Yuri as a reviewer on GitHub. Yuri checks GitHub notifications or the PR queue daily.
2. **Gate checkpoint** — Triggered by sprint cadence (see gate timing in Section 3). Yuri proactively checks whether gate preconditions are met and initiates the gate review.
3. **Bug reports** — Filed as Jira issues with label `bug` and assigned to Yuri for investigation. Follow Workflow 2e (Bug Investigation).

If a task arrives without sufficient context (e.g., a PR with no description, a bug report with no reproduction steps), send it back to the originator before starting work.
```

**3d. Add test vector precondition note**

In Section 2a (Writing New Test Suites), add after step 2:

```markdown
2b. **For prediction accuracy tests:** Confirm that validated test vectors from Lee are available (Decision #13). If vectors are not available, write structural tests only (response shape, status codes, tier assignment logic) and document that accuracy validation is blocked.
```

### 4. Skill Invocation Feedback

**The tier assignments are correct.** I have no objections to any skill being in the wrong tier. Specific feedback:

- **`/python-testing-patterns` as Tier 1 for Schemathesis work: correct.** Schemathesis runs on pytest, so this skill applies even though I am testing API contracts, not writing unit tests.
- **`/agent-browser` for accessibility: correct and critical.** This is the single most important skill assignment. The explicit prohibition on Playwright MCP is necessary and should stay prominent.
- **`/verification-before-completion` as Tier 2: correct placement.** It would be overkill to invoke on every single test I write, but it is essential before any sign-off. The "evidence before assertions" framing is the right mental model.
- **`/subagent-verification-loops` as Tier 3: correct.** I have not used it yet, but it makes sense for sprint-level passes where I am reviewing 4+ PRs across frontend, backend, and infra.
- **`/frontend-code-review` as excluded: agreed.** I review for functional correctness, not code style. Harshit and Copilot/CodeRabbit handle that.
- **`/test-driven-development` as excluded: agreed.** I write tests after features exist, not before. TDD is for the implementers.
- **`/frontend-testing` as excluded: agreed.** It overlaps with `/javascript-testing-patterns` and the JS testing skill already covers Vitest + RTL.

**One missing skill consideration:** `/webapp-testing` appears in the Tier 1 table for smoke-testing but is not listed as a standalone Tier 1 skill — it is always paired with `/agent-browser`. This is fine in practice, but the quick reference card should clarify that `/webapp-testing` is a Tier 1 skill (not just a Tier 1 pairing). If I ever need the test structure and checklist without actually driving a browser (e.g., writing a manual test plan for someone else to execute), `/webapp-testing` alone would be Tier 2.

### 5. Workflow Gaps

The SOP covers the core QA tasks well, but the following are QA activities I perform (or should perform) that have no workflow:

**5a. Security/HIPAA verification.**

My notes (Section 8) document a full security test plan for magic link auth, guest session security, and audit log integrity. The SOP mentions "HIPAA checklist is 100% verified" in Gate 4 but has no workflow for how I verify HIPAA items. This is a manual process involving infrastructure inspection (encryption at rest, TLS configuration, RBAC), audit log queries, and data retention policy validation. It needs its own workflow section, especially because it requires coordination with Gay Mark (DB) and Luca (infra).

**5b. Contract alignment audits across agents.**

The age max 100/120 finding from Sprint 2 was a cross-boundary misalignment: frontend said 100, backend said 120, DB constraint was different again. The SOP mentions this in Workflow 2b (step 5) but only for PR reviews. There should be a periodic (per-sprint) full contract alignment audit where I systematically compare validation ranges, field names, error codes, and enum values across `api_contract.json`, `db_schema.sql`, `validation.ts`, and the Pydantic models. This is not a PR-level task — it is a sprint-level audit.

**5c. Regression suite maintenance.**

The SOP says "every bug fix requires a regression test" and "full regression suite runs nightly," but there is no workflow for maintaining the regression suite itself: pruning obsolete tests, refactoring flaky tests, updating fixtures when schemas change, and reviewing coverage gaps. This is ongoing maintenance work that needs periodic attention, not just when a bug is filed.

**5d. Test environment setup and teardown.**

I need a running local environment to do smoke testing, E2E testing, and contract testing against live APIs. The SOP assumes the environment is available but does not describe how I stand it up, verify it is healthy, or tear it down. For a multi-service stack (Next.js + FastAPI + PostgreSQL), this is non-trivial and should be documented — even if it is just a pointer to a script or docker-compose file.

---

## Part 2: Self-Assessment — Biggest Weaknesses

### Weakness 1: Visual Regression Testing with Visx/SVG

**Name:** I have limited practical experience with visual regression testing of SVG-based chart components.

**Impact:** The KidneyHood prediction chart is the centerpiece of the product. It renders 4 trajectory lines, stat cards, a dialysis threshold, and confidence tier badges using Visx (which outputs SVG). Visual regression testing of SVG is fundamentally different from testing rasterized screenshots — SVG elements can shift by fractions of pixels due to font rendering differences, viewport scaling, or Visx internal layout changes. I do not yet have a reliable methodology for setting pixel diff thresholds that catch real regressions without producing false positives.

**Example:** In my test strategy (`test_strategy.md`, Section 2), I specified "Playwright screenshot comparison (SVG/Visx)" as the visual regression tool and noted that "baselines use true linear time x-axis." But I did not define what an acceptable pixel diff threshold is, how to handle chart animations (if any), or how to isolate SVG rendering from browser-specific font differences. The strategy says *what* tool to use but not *how* to use it reliably for this specific rendering stack. I wrote the spec without having actually run a visual regression suite against Visx output.

**What would help:**
- A spike task (half a day) to set up Playwright visual regression against the actual chart component, run it across Chromium/Firefox/WebKit, and calibrate the threshold.
- Access to `/e2e-testing-patterns` skill guidance specifically for SVG screenshot comparison patterns.
- A pairing session with Harshit to understand Visx's rendering lifecycle — when does SVG stabilize after data loads? Are there animations that need to complete before screenshots are taken?

### Weakness 2: Load/Performance Testing with k6

**Name:** I have specified k6 as the load testing tool but have not written or run k6 scripts on this project.

**Impact:** The test strategy sets a concrete target: POST /predict < 2s p95 at 100 concurrent users. This is a meaningful threshold for a medical prediction app where users may cluster during clinic hours. But I have not validated this target against the actual Railway deployment, and I have not written the k6 scripts to measure it. If the prediction engine is slow under load (which is plausible given it runs a proprietary calculation), we would not discover it until production.

**Example:** In `test_strategy.md` Section 2, I listed k6 as the load testing framework with a one-line rationale: "k6 chosen over Locust for scriptability and CI integration." In the CI integration plan (Section 9b), I noted "nightly full regression run (including visual regression and load tests)." But there are zero k6 scripts in the repository, no load test configuration, and no baseline performance numbers. The load testing plan exists only on paper.

**What would help:**
- A Jira card specifically for k6 script development targeting the /predict and /lab-entries endpoints.
- Access to the Railway staging environment to run load tests against real infrastructure (local load testing against FastAPI in debug mode is not representative).
- Guidance on Railway's concurrency limits and connection pooling — Gay Mark or Luca would know whether Railway can even handle 100 concurrent connections.

### Weakness 3: Knowing When PRs Are Ready for QA

**Name:** I have no systematic way to know when a PR is ready for my review.

**Impact:** On this project, engineers (Harshit, John, Gay Mark) work on feature branches and create PRs. But there is no standard signal that says "this PR is code-complete and ready for QA." Sometimes I review a PR that is still WIP. Sometimes a PR sits for hours before I notice it needs review. This creates either wasted effort (reviewing incomplete work) or delays (PR waiting on me without my knowledge).

**Example:** During Sprint 2, the dashboard PR (#9) and the DB migration PR (#10) were both ready for review at different times, but I wrote my Sprint 2 QA Report #1 reviewing multiple PRs in a batch rather than reviewing each as it became ready. My report covered findings across PRs that were at different stages of completion. The age max 100/120 finding (a real cross-boundary bug) was caught, but it could have been caught earlier if I had reviewed the individual PRs as they matured.

**What would help:**
- A convention where engineers move their Jira card to "In Review" and assign me as a GitHub reviewer simultaneously. That gives me two signals.
- A GitHub label like `ready-for-qa` that I can filter on. Or a Jira automation that notifies me when a card enters "In Review."
- The intake process I proposed in Section 3 (Proposed Changes, 3c) would formalize this.

### Weakness 4: HIPAA Compliance Verification Depth

**Name:** My HIPAA compliance testing is currently checklist-based rather than infrastructure-verified.

**Impact:** The test strategy and notes document a thorough HIPAA checklist: AES-256 encryption at rest, TLS in transit, audit logging, data retention, RBAC, guest session purge. But most of these items cannot be verified in a local development environment. They require inspecting the actual Railway/PostgreSQL configuration, checking TLS certificates, verifying encryption settings, and confirming RBAC policies on the deployed infrastructure. I have not done any of this yet because the staging environment was not available during Sprint 2.

**Example:** In my notes (Section 5, "HIGH RISK: HIPAA Compliance Validation"), I wrote: "HIPAA compliance testing requires infrastructure to be provisioned. This cannot be fully validated in local/mock environments. I need a staging environment that mirrors production security controls." This was written on March 25. Two days later, the backend is deploying on Railway, but I have not verified a single HIPAA infrastructure control. My QA reports from Sprint 2 focused on functional correctness (validation ranges, component behavior, cross-boundary alignment) and did not touch HIPAA because the infrastructure was not ready. When it is ready, I will need to ramp up quickly on Railway-specific security verification.

**What would help:**
- A walkthrough from Luca on the Railway infrastructure setup — what is configured, what is not, what I can verify and how.
- Access to Railway's dashboard or CLI to inspect database encryption settings, connection TLS status, and environment variable management.
- A pairing session with Gay Mark on the PostgreSQL audit logging configuration — is `pgaudit` installed? Are all PHI tables covered? Can I query the audit log directly?

### Weakness 5: Accessibility Testing Beyond axe-core

**Name:** I am stronger at automated accessibility scanning (axe-core) than manual screen reader testing.

**Impact:** axe-core catches approximately 60% of WCAG 2.1 AA violations. The remaining 40% — including screen reader announcement order, keyboard focus management, and meaningful alt text for dynamic chart data — requires manual testing with VoiceOver (or NVDA/JAWS on Windows). The target demographic is 60+ CKD patients, many of whom may use assistive technology. A chart that passes axe-core but is meaningless to a screen reader is a failure for this user base.

**Example:** My test strategy (Section 2) lists "axe-core via `@axe-core/playwright`" as the accessibility framework and notes that "remaining 40% requires manual screen reader testing." My notes (Section 5, "MEDIUM RISK: Accessibility for 60+ Patients") identify specific concerns: color contrast on chart lines, touch target sizes, screen reader compatibility for SVG chart data, and keyboard navigation. But my Sprint 2 QA reports focused exclusively on automated checks (axe-core scan results, touch target measurements, font size verification). I did not perform manual screen reader testing because there were no deployed interactive components to test with VoiceOver. When the full prediction flow is running, I need to conduct genuine screen reader walkthroughs — and my experience doing that methodically is limited.

**What would help:**
- The `/agent-browser` skill for browser-based accessibility testing, which is already assigned as Tier 1. I need to actually use it for a real screen reader audit, not just automated scans.
- A structured screen reader testing protocol: which pages to test, which screen reader (VoiceOver on macOS), what to listen for at each step, how to document findings. The SOP's Section 2d (Accessibility Audits) provides a good starting framework, but I would benefit from a practice run on the existing prototype before the full prediction flow is ready.
- Guidance from Inga on how SVG chart data should be conveyed to screen readers — are we using `aria-label` on SVG groups, a visually hidden data table, or `role="img"` with a description? The approach affects what I test for.

### Weakness 6: Test Data Management at Scale

**Name:** My test data strategy is well-designed on paper but has not been stress-tested in practice.

**Impact:** The test strategy defines synthetic data fixtures for lab values, user accounts, guest sessions, multi-visit data, eGFR trajectories, and tier transitions. This covers the happy paths and the documented edge cases. But I have not thought through: (a) how test data is shared between unit, integration, and E2E tests without duplication, (b) how to keep fixtures in sync when the schema changes (Gay Mark has already revised the schema once), and (c) how to generate realistic-looking data at the volume needed for load tests (100 concurrent users means 100 concurrent sets of lab entries).

**Example:** In `test_strategy.md` Section 9c (Test Data Strategy), I defined six categories of test data with a table. In my notes Section 6, I wrote 8 explicit tier transition test cases with hardcoded values. But there is no shared fixture library yet, no factory functions, and no mechanism to detect when a fixture becomes stale because the schema changed. If Gay Mark adds a required field to `lab_entries`, every fixture that omits it will silently pass unit tests (which mock the DB) and fail integration tests (which hit the real DB). That kind of silent divergence is exactly what a good test data strategy should prevent.

**What would help:**
- A shared fixture library (Python for backend, TypeScript for frontend) with factory functions that generate valid test data from the schema. When the schema changes, the factory breaks at one point instead of across 50 test files.
- Integration with the DB migration pipeline — when Gay Mark runs a new Alembic migration, a CI step should verify that all test fixtures still produce valid data against the new schema.
- For load testing: a data generator script that produces N unique but realistic patient records. This should be parameterized and reusable.

---

## Summary

The SOP is a strong foundation. It codifies process that was previously implicit, the skill tier assignments are correct, and the reporting standards will make my QA output more consistent. The main gaps are missing workflows for contract testing, visual regression, load testing, HIPAA verification, and task intake. The proposed changes in Section 3 are ready to be added if Luca approves.

On the self-assessment: my biggest risks to the project are visual regression testing (Visx/SVG is new territory), load testing (plan exists, scripts do not), and HIPAA verification (blocked on infrastructure access). These are all addressable with focused spike tasks and the right access. The process weaknesses (knowing when PRs are ready, test data management) are solvable with team conventions.
