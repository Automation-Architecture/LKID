# QA Skills Recommendations for Yuri — Request for QA Testing SOP

**From:** Brad (via CTO channel)
**To:** Luca (CTO / Orchestrator)
**Date:** 2026-03-27
**Re:** Skill assignments for Yuri + request to author a QA Testing SOP

---

## Context

We audited the full skills catalog against Yuri's actual work output (test strategy, QA reports, golden file tests, sprint QA reports) and his role boundaries. The goal: equip Yuri with the right skills invoked at the right time, so QA quality is consistent and repeatable across sprints.

The skill invocation rules have already been added to Yuri's agent prompt (`agents/yuri/notes.md`, Section 0). This document explains the rationale and asks you to formalize them into a **QA Testing SOP** that governs how Yuri operates going forward.

---

## Skill Assignments

### Tier 1 — Foundational (Always Invoke)

These are bundled directly into Yuri's prompt as mandatory rules. When Yuri performs these task types, he invokes the skill before starting work.

| Skill | Trigger | Rationale |
|-------|---------|-----------|
| `/python-testing-patterns` | Writing or reviewing pytest tests (backend unit, integration, fixtures, async) | Backend is FastAPI + pytest + pytest-asyncio. Yuri's test strategy (Section 2) specifies this exact stack. Skill provides fixture patterns, mocking strategies, and TDD workflows. |
| `/javascript-testing-patterns` | Writing or reviewing Vitest/RTL tests (frontend unit, component) | Frontend is Next.js 15 + Vitest + React Testing Library. Yuri's test strategy specifies these tools. Covers mocking, fixtures, and component testing. |
| `/e2e-testing-patterns` | Writing, debugging, or maintaining Playwright E2E tests | Yuri owns 8 critical E2E journeys (test strategy Section 9e). Skill covers selector strategies, flaky test mitigation, CI integration, and cross-browser patterns. |
| `/systematic-debugging` | Investigating any bug, test failure, or unexpected behavior | Yuri's QA reports already show strong cross-boundary thinking (e.g., the age max 100/120 mismatch traced across frontend, backend, and DB). This skill formalizes that into a repeatable investigation process. Prevents ad-hoc grepping and ensures root cause analysis before fixes. |
| `/agent-browser` | Screen reader testing or manual accessibility audits | axe-core catches ~60% of WCAG violations (per Yuri's own strategy doc). The remaining 40% requires manual screen reader testing. Target demographic is 60+ CKD patients — accessibility is non-negotiable. **Important:** Use `/agent-browser`, NOT Playwright MCP, for all browser-based testing. |

### Tier 2 — High Value (Invoke When Applicable)

These are documented in Yuri's prompt but left to his judgment on when to apply.

| Skill | Trigger | Rationale |
|-------|---------|-----------|
| `/webapp-testing` | Smoke-testing a PR's behavior in a local running app | Quick browser-based verification before writing a formal QA report. Useful for visual checks and interactive flows before committing to a full written report. |
| `/verification-before-completion` | About to sign off on a QA report or claim a QA gate is passed | Yuri is literally the verification gate for the project. This skill enforces "run it, prove it, then report" — evidence before assertions. Prevents premature sign-offs. |

### Tier 3 — Situational (Use Judgment)

These are available but not prompted by default. Use when the situation warrants it.

| Skill | Trigger | Rationale |
|-------|---------|-----------|
| `/subagent-verification-loops` | Running a large QA pass across multiple PRs or an entire sprint | Spawn sub-reviewers to check coverage across different areas in parallel. Amplifies thoroughness on big passes but adds complexity — not needed for single-PR reviews. |
| `/code-review-excellence` | Reviewing PR code for testability or correctness patterns | Provides structured review checklists. Most useful when reviewing another agent's implementation for test gaps. Marginal value for Yuri's usual QA-focused reviews (functional correctness, boundary checks). |

### Explicitly Excluded

| Skill | Why Excluded |
|-------|-------------|
| `/frontend-code-review` | Yuri reviews for functional correctness and boundary behavior, not code style or architecture. Different lens. |
| `/test-driven-development` | TDD is for developers writing feature code. Yuri writes tests *after* the feature exists to validate it — a fundamentally different workflow. |
| `/frontend-testing` | Overlaps with `/javascript-testing-patterns`. The JS testing skill is more general and covers the same Vitest + RTL patterns without being framework-specific to Dify. |

---

## Request: Write a QA Testing SOP

Luca, please author a **QA Testing SOP** (`docs/qa-testing-sop.md`) that codifies:

1. **Skill invocation rules** — The "always use X when doing Y" table above, as binding process for Yuri.
2. **QA workflow per task type** — How Yuri should approach each type of QA work:
   - Writing new test suites (unit, integration, E2E)
   - QA reports on PRs
   - Sprint-level QA passes
   - Accessibility audits
   - Bug investigation and regression testing
3. **QA gate criteria** — Formalize the gates from Yuri's test strategy (Section 10c) into the SOP so they're enforceable, not just documented.
4. **Reporting standards** — The format and depth expected for QA reports (Yuri's sprint2-qa-report-1 and sprint2-qa-report-2 are good templates).
5. **Skill escalation path** — When Yuri should escalate from Tier 1 skills to Tier 2/3 skills (e.g., a single PR review vs. a full sprint QA pass).
6. **Integration with CI** — How skill-driven QA outputs feed into the GitHub Actions pipeline (test results, coverage reports, a11y scan results as PR comments).

The SOP should reference Yuri's existing test strategy (`agents/yuri/drafts/test_strategy.md`) as the technical foundation and this document as the skill assignment rationale.

---

## Summary

| Tier | Skills | Integration |
|------|--------|-------------|
| Tier 1 (5 skills) | python-testing-patterns, javascript-testing-patterns, e2e-testing-patterns, systematic-debugging, agent-browser | Mandatory — baked into Yuri's prompt |
| Tier 2 (2 skills) | webapp-testing, verification-before-completion | Recommended — in prompt, Yuri's judgment |
| Tier 3 (2 skills) | subagent-verification-loops, code-review-excellence | Available — situational use |
| Excluded (3 skills) | frontend-code-review, test-driven-development, frontend-testing | Not applicable to Yuri's role |

Total: 9 active skills, 3 excluded with documented rationale.
