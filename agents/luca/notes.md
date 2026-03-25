# Luca — Working Notes

## Drafting Status

| Artifact | Path | Status | Updated |
|----------|------|--------|---------|
| Architecture Document | `agents/luca/drafts/architecture.md` | DRAFT — ready for Meeting 2 cross-review | 2026-03-25 |

## Architecture Document — Drafting Notes

### What was done (Step 5)
- Completed full architecture document covering all 11 required sections plus decision log and open items appendix
- Added Sprint Plan (Section 11) aligned with Husser's PRD sprint structure
- Added Risks & Mitigations (Section 12) synthesizing risks from all agents
- Fixed inconsistencies with John's API contract:
  - Rate limiting: aligned to John's per-minute limits (was per-hour)
  - Access token lifetime: corrected to 1hr (was 15min)
  - Pagination: corrected to offset-based (was cursor-based)
  - Token storage: aligned with John's guidance (access token in memory, not httpOnly cookie)
- Noted `refresh_tokens` table as open item (architecture references it but Gay Mark's schema doesn't include it yet)
- Noted `egfr_calculated` caching as open alignment item between John and Gay Mark

### Cross-references validated
- John Donaldson's API contract: `agents/john_donaldson/drafts/api_docs.md`
- Gay Mark's DB schema: `agents/gay_mark/drafts/db_docs.md`
- Harshit's frontend architecture: `agents/harshit/drafts/frontend_architecture.md`
- Husser's PRD: `agents/husser/drafts/PRD.md`
- Yuri's test strategy: `agents/yuri/drafts/test_strategy.md`

### Open alignment items for Meeting 2
1. Refresh token storage strategy (in-memory vs. DB table) — needs decision from John/Gay Mark/Luca
2. `egfr_calculated` — John's API returns it, Gay Mark has no column. Compute-on-fly is fine for MVP.
3. `sex` field on `lab_entries` vs. `users` table — John's API has it per-entry, Gay Mark has it on users only. Guest inline data has it in JSONB.
