# tests/

This directory is reserved for QA final reports only — it is not a test suite.

| File | Description |
|------|-------------|
| `report.md` | Final QA test report — generated during the Development Phase QA loop (must be approved for project completion) |

For the actual test suites, see:

- **`app/tests/`** — Playwright E2E, accessibility (axe-core), and visual regression tests for the Next.js frontend
- **`backend/tests/`** — pytest unit and integration tests for the FastAPI backend, plus `load/` for k6 load scripts
