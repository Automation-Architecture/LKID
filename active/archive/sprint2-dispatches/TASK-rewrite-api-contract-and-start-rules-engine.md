# Task: Rewrite API Contract + Start Rules Engine

**Priority:** P0 — must be done before Sprint 2 (Mar 26)
**Assigned to:** John Donaldson (API Designer)
**Date:** 2026-03-26

---

## Task 1: Rewrite API Contract

Your current `api_contract.json` has 12 endpoints from the original PRD scope. The Lean Launch MVP PRD says **5 endpoints**. Your contract still references custom rate-limit headers, guest sessions, and "PDF export deferred to Phase 2b" — all wrong for lean launch.

**Rewrite `api_contract.json` to these 5 endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check for Railway |
| POST | `/predict` | Core prediction — takes BUN, creatinine, age; returns 4 trajectories + dial_ages + bun_suppression_estimate |
| POST | `/predict/pdf` | Playwright PDF generation from results page |
| POST | `/webhooks/clerk` | Clerk auth webhook → leads table |
| GET | `/leads` | Internal: list captured leads (admin only) |

**Key corrections:**
- No potassium in `/predict` input (Lee's v2.0 correction)
- `/predict` response must match Lee's calc spec structure (see `server_side_calc_spec_v1.md` Section 3.6)
- No custom rate-limit headers — use slowapi defaults
- No guest session endpoints

## Task 2: Start LKID-14 (Rules Engine)

This is the **critical path item** for Sprint 2. Lee's calc spec fully unblocks it. You have everything you need.

**Read:** `server_side_calc_spec_v1.md` — the entire document, especially:
- Section 1: Time points array (15 values)
- Section 2: Dialysis threshold (eGFR 12, NOT 15)
- Section 3: All four trajectory paths with Python pseudocode
- Section 3.7: BUN suppression estimate (new field)
- Section 4: Three test vectors — your golden file (±0.2 tolerance)

**Implement a Python module** that:
1. Computes starting eGFR via CKD-EPI 2021 (Section 3.1)
2. Computes no-treatment trajectory (Section 3.2)
3. Computes Phase 1 gain for 3 BUN tiers (Section 3.3)
4. Computes Phase 2 gain (Section 3.4)
5. Computes post-Phase 2 decline (Section 3.5)
6. Computes dial_ages per trajectory
7. Computes bun_suppression_estimate
8. Passes all 3 test vectors within ±0.2 tolerance

**Start now.** If this is done before Mar 26, Sprint 2 effectively shrinks by 3-4 days.

## Reference

- Lean Launch PRD: `artifacts/lean-launch-mvp-prd.md`
- Lee's calc spec: `server_side_calc_spec_v1.md`
- Your backend research: `agents/john_donaldson/drafts/backend-research.md`
