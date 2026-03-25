# Compressed Summary — Post-Discovery Phase

> Last updated: 2026-03-25 (end of Discovery Phase, entering Development Phase)

## Project Overview

KidneyHood: a HIPAA-compliant web app where CKD patients enter lab values and view a 10-year eGFR trajectory chart. Magic link auth only, no passwords. Guests can try instantly; accounts save data permanently.

**Stack:** Next.js 15 (Vercel) + FastAPI/Python (ECS/Fargate) + PostgreSQL (RDS/KMS)

## Key Architectural Decisions (14 binding)

1. **Magic link auth only** — no passwords, no bcrypt, no credential storage
2. **PDF export deferred** to Phase 2b
3. **Sex field required** — male/female/unknown; "unknown" lowers confidence
4. **All guest data is PHI** — full encryption, audit logging, 24hr TTL purge
5. **True linear time axis** on eGFR chart (months 0-120)
6. **Visx (D3+React)** for charting — two spec variants pending POC
7. **No BFF layer** — frontend calls FastAPI directly with CORS
8. **Separate storage from prediction** — POST /lab-entries vs. POST /predict
9. **Standardized error envelope** — {error: {code, message, details[]}}
10. **No prediction storage** — compute on demand, never persist
11. **Sticky disclaimer footer on mobile**, inline on desktop
12. **Tier 2 requires BOTH hemoglobin AND glucose** (not either/or)
13. **Test vectors from Lee** are a patient safety blocker for Sprint 1
14. **Audit trail survives deletion** — ON DELETE SET NULL on audit_log.user_id

## Discovery Phase Learnings

- **PRD must be post-Meeting-2 synthesis** — never drafted in parallel with domain docs (SOP revised to v2.0)
- **Contract-first development** enables true parallel work via MSW mocks + Schemathesis
- **HIPAA shapes every layer** from day one — it is not a bolt-on
- **Frontend carries 54% of tickets** — plan capacity accordingly
- **Two-meeting flow** (V1 -> debate -> V2 -> synthesis) caught 14 decisions before code
- **Dual decision authority** (CTO=technical, PM=product) resolves deadlocks
- **Multi-owner tickets** need explicit primary ownership to avoid diffusion of responsibility
- **Agent workspace isolation** (read-only cross-access) prevented all merge conflicts

## Memory Inventory

| File | Entries | Coverage |
|------|---------|----------|
| patterns.json | 31 | Architecture, API, DB, frontend, UX, test strategy, SOP |
| anti_patterns.json | 19 | DB, architecture, auth, API, UX, SOP, test |
| decisions.json | 16 | 14 PRD binding decisions + 2 bootstrap decisions |
| insights.json | 17 | Process, architecture, capacity, compliance, coordination |
| tooling.json | 31 | Full stack: frontend (10), backend (3), DB (5), testing (7), infra (5), design (1) |

## Sprint 0 Blockers

- SPEC-80: Lee's test vectors (patient safety blocker)
- SPEC-81: Prediction engine code
- SPEC-82: OpenAPI spec publication
- SPEC-83: DDL schema publication
- SPEC-85: Refresh token storage decision
- SPEC-74/75/78: Unowned infrastructure tickets (ALB HTTPS, FastAPI TLS, CloudWatch)
