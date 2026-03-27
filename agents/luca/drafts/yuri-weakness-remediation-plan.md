# Yuri Weakness Remediation Plan

**Author:** Luca (CTO / Orchestrator)
**Date:** 2026-03-27
**Purpose:** Concrete task list addressing Yuri's self-identified weaknesses 1, 2, 4, and 6. Each item is Jira-card-ready for Brad's approval.

---

## Weakness 1: Visual Regression Testing with Visx/SVG

### Task 1.1: Spike — Playwright Visual Regression Setup for Visx Chart

- **Title:** Spike: set up Playwright visual regression for Visx eGFR chart component
- **Owner(s):** Yuri (primary), Harshit (pairing)
- **Sprint:** Sprint 3 (requires chart component to be integrated, which is Sprint 2 work)
- **Dependencies:**
  - Visx chart component merged and rendering with sample data (LKID-15 or equivalent)
  - Playwright installed and configured in the project
- **Acceptance criteria:**
  - Playwright visual regression project configured in `playwright.config.ts` with a dedicated `visual-regression` project
  - At least 3 baseline screenshots captured: chart with single visit, chart with 3+ visits showing trajectory, chart at dialysis threshold
  - Screenshots captured across Chromium, Firefox, and WebKit
  - Pixel diff thresholds documented per browser engine with rationale (e.g., "WebKit requires 0.3% tolerance due to SVG font rendering differences")
  - Spike findings written up in `agents/yuri/drafts/visual-regression-spike.md`
- **Estimated effort:** M

### Task 1.2: Pairing session — Visx rendering lifecycle

- **Title:** Pair with Harshit on Visx rendering lifecycle and screenshot timing
- **Owner(s):** Yuri + Harshit
- **Sprint:** Sprint 3 (early, before Task 1.1 spike concludes)
- **Dependencies:**
  - Chart component exists and renders (Sprint 2 delivery)
- **Acceptance criteria:**
  - Yuri documents: when SVG stabilizes after data load, whether animations exist and their duration, recommended `waitForSelector` or `waitForFunction` strategy for Playwright
  - Findings captured in the spike writeup (Task 1.1)
- **Estimated effort:** S

---

## Weakness 2: Load/Performance Testing with k6

### Task 2.1: Write k6 load test scripts for /predict and /lab-entries

- **Title:** Write k6 load test scripts targeting /predict and /lab-entries endpoints
- **Owner(s):** Yuri (primary), John Donaldson (API contract reference)
- **Sprint:** Sprint 3
- **Dependencies:**
  - Backend deployed on Railway staging (LKID-8 merged, Railway deployment live)
  - API contract finalized for /predict and /lab-entries endpoints
  - Lee's validated test vectors available for realistic /predict payloads (or use structural test data if vectors are still pending)
- **Acceptance criteria:**
  - k6 script for POST /predict: ramps to 100 concurrent virtual users, measures p50/p95/p99 latency, asserts p95 < 2s
  - k6 script for POST /lab-entries: ramps to 50 concurrent virtual users, measures throughput and error rate
  - k6 script for GET /lab-entries/{patient_id}: read path under load
  - Scripts use parameterized test data (unique patient records per VU, not the same payload repeated)
  - Scripts are committed to `backend/tests/load/` with a README explaining how to run them
  - Baseline performance numbers documented from first staging run
- **Estimated effort:** M

### Task 2.2: Luca provides Railway concurrency guidance

- **Title:** Document Railway concurrency limits and connection pooling for load test planning
- **Owner(s):** Luca
- **Sprint:** Sprint 2 (can be done now, unblocks Task 2.1)
- **Dependencies:**
  - Railway deployment active
- **Acceptance criteria:**
  - Documented in `agents/luca/drafts/infrastructure-setup.md`: Railway plan limits (concurrent connections, memory, CPU), PostgreSQL connection pool size, Uvicorn worker count
  - Yuri can reference these numbers to set realistic k6 thresholds
- **Estimated effort:** S

### Task 2.3: Grant Yuri Railway staging access

- **Title:** Grant Yuri read access to Railway staging environment for load testing
- **Owner(s):** Luca
- **Sprint:** Sprint 2 (prerequisite for Sprint 3 load testing)
- **Dependencies:**
  - Railway project exists
- **Acceptance criteria:**
  - Yuri has the staging API URL and can reach it from his environment
  - Yuri has read-only access to Railway dashboard to observe resource usage during load tests
  - Access documented in infra setup notes
- **Estimated effort:** S

---

## Weakness 4: HIPAA Compliance Verification Depth

### Task 4.1: Luca conducts Railway infrastructure walkthrough for Yuri

- **Title:** Conduct Railway infrastructure walkthrough covering security controls for HIPAA verification
- **Owner(s):** Luca (presenter), Yuri (attendee)
- **Sprint:** Sprint 3 (early, before Gate 4 pre-release)
- **Dependencies:**
  - Railway staging deployment is live and stable
  - Infrastructure setup doc is current (`agents/luca/drafts/infrastructure-setup.md`)
- **Acceptance criteria:**
  - Yuri has seen: Railway dashboard security settings, PostgreSQL encryption configuration, TLS certificate status, environment variable management, deployment logs
  - Yuri documents what he can verify independently vs. what requires Luca's access
  - Walkthrough notes added to `agents/yuri/drafts/hipaa-verification-notes.md`
- **Estimated effort:** S

### Task 4.2: Grant Yuri Railway dashboard/CLI access for security inspection

- **Title:** Grant Yuri Railway CLI access for HIPAA infrastructure verification
- **Owner(s):** Luca
- **Sprint:** Sprint 2 (prerequisite for Sprint 3 HIPAA verification)
- **Dependencies:**
  - Railway project exists
- **Acceptance criteria:**
  - Yuri can run `railway variables` to inspect env var configuration (names only, not values)
  - Yuri can view database connection settings to verify SSL mode
  - Yuri can check deployment logs for TLS handshake evidence
  - Access is read-only — Yuri cannot modify infrastructure
- **Estimated effort:** S

### Task 4.3: Pairing session — PostgreSQL audit logging with Gay Mark

- **Title:** Pair with Gay Mark on pgaudit configuration and audit log verification
- **Owner(s):** Yuri + Gay Mark
- **Sprint:** Sprint 3
- **Dependencies:**
  - PostgreSQL deployed on Railway
  - Gay Mark has configured (or will configure) pgaudit extension
- **Acceptance criteria:**
  - Yuri can query the audit log and verify that INSERT/UPDATE/DELETE on PHI tables are logged
  - Yuri documents which tables are covered and which audit log fields are available
  - If pgaudit is not yet installed, this task produces a blocking finding: "pgaudit required for HIPAA Gate 4"
  - Findings documented in `agents/yuri/drafts/hipaa-verification-notes.md`
- **Estimated effort:** S

---

## Weakness 6: Test Data Management at Scale

### Task 6.1: Build shared fixture library with factory functions

- **Title:** Create shared test fixture library with factory functions for backend and frontend
- **Owner(s):** Yuri (primary), Gay Mark (schema reference), Harshit (frontend fixtures)
- **Sprint:** Sprint 3
- **Dependencies:**
  - DB schema stable (LKID-7 merged, no pending schema-breaking migrations)
  - API contract finalized for request/response shapes
- **Acceptance criteria:**
  - Python fixture library at `backend/tests/fixtures/factories.py`: factory functions for `Patient`, `LabEntry`, `Prediction` that produce valid data matching the current Alembic head schema
  - TypeScript fixture library at `app/src/test/fixtures/factories.ts`: factory functions for API response shapes matching `api_contract.json`
  - Each factory supports overrides (e.g., `create_lab_entry(age=85, egfr=45)`) with sensible defaults
  - All existing test files that use inline test data are migrated to use factories (or a migration plan is documented if too many to convert in one sprint)
  - Factories break loudly (type error or validation error) if a required field is added to the schema
- **Estimated effort:** L

### Task 6.2: CI validation — Alembic migration step checks fixtures against schema

- **Title:** Add CI step to validate test fixtures against latest Alembic schema
- **Owner(s):** Yuri (CI config), Gay Mark (migration support)
- **Sprint:** Sprint 3
- **Dependencies:**
  - Task 6.1 (fixture factories must exist)
  - CI pipeline configured (GitHub Actions)
- **Acceptance criteria:**
  - GitHub Actions workflow includes a step after `alembic upgrade head` that imports all factory functions and calls each one, asserting no validation errors
  - If Gay Mark adds a required column and a factory does not produce it, CI fails with a clear error message identifying the stale factory
  - Step runs on every PR that touches `backend/alembic/` or `backend/tests/fixtures/`
- **Estimated effort:** M

### Task 6.3: Build k6 test data generator for load testing

- **Title:** Create parameterized data generator script for k6 load test payloads
- **Owner(s):** Yuri
- **Sprint:** Sprint 3 (after Task 6.1 factories exist)
- **Dependencies:**
  - Task 6.1 (factory functions provide the generation logic)
  - Task 2.1 (k6 scripts define what payloads are needed)
- **Acceptance criteria:**
  - Python script at `backend/tests/load/generate_test_data.py` that produces N unique patient records with realistic lab values (within valid ranges from the API contract)
  - Output is a JSON file consumable by k6's `SharedArray`
  - Script is parameterized: `python generate_test_data.py --count 500 --output test_data.json`
  - Generated data covers edge cases: boundary eGFR values, multiple CKD stages, varying visit counts
- **Estimated effort:** S

---

## Summary Table

| Task | Title | Owner(s) | Sprint | Size | Dependencies |
|------|-------|----------|--------|------|--------------|
| 1.1 | Spike: Playwright visual regression for Visx chart | Yuri, Harshit | 3 | M | Chart component merged |
| 1.2 | Pair on Visx rendering lifecycle | Yuri, Harshit | 3 | S | Chart component exists |
| 2.1 | Write k6 load test scripts | Yuri, John Donaldson | 3 | M | Staging deployed, contract finalized |
| 2.2 | Document Railway concurrency limits | Luca | 2 | S | Railway active |
| 2.3 | Grant Yuri Railway staging access | Luca | 2 | S | Railway active |
| 4.1 | Railway infrastructure walkthrough | Luca, Yuri | 3 | S | Staging live |
| 4.2 | Grant Yuri Railway CLI access | Luca | 2 | S | Railway active |
| 4.3 | Pair on pgaudit with Gay Mark | Yuri, Gay Mark | 3 | S | PostgreSQL deployed |
| 6.1 | Shared fixture library with factories | Yuri, Gay Mark, Harshit | 3 | L | Schema stable, contract finalized |
| 6.2 | CI fixture validation step | Yuri, Gay Mark | 3 | M | Task 6.1 done |
| 6.3 | k6 test data generator | Yuri | 3 | S | Tasks 6.1, 2.1 done |

**Sprint 2 tasks (3):** 2.2, 2.3, 4.2 — all Luca-owned access/documentation tasks that unblock Sprint 3 work.
**Sprint 3 tasks (8):** Everything else — the actual capability-building work.
