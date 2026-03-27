# Task: Rewrite Database Schema for Lean Launch

**Priority:** P0 — must be done before Sprint 2 (Mar 26)
**Assigned to:** Gay Mark (Database Engineer)
**Date:** 2026-03-26

---

## What's Wrong

Your current `db_schema.sql` has 5 tables (users, magic_link_tokens, lab_entries, guest_sessions, audit_log) with HIPAA/RBAC infrastructure and a `potassium` column in `lab_entries`. This was correct for the original 89-ticket PRD, but the CEO Test cut scope dramatically.

The **Lean Launch MVP PRD** (the binding document) says:

- **1 table: `leads`** + Clerk handles auth
- No user accounts, no saved history, no audit logging
- Stateless lead-gen tool — we capture email + prediction inputs, nothing more

Your schema is a landmine. If any Sprint 2 agent references it, they'll build the wrong thing.

## What To Do

Rewrite `db_schema.sql` as a single `leads` table DDL for Railway Postgres:

```sql
-- leads table: captures email + prediction inputs for warm campaign
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  bun NUMERIC NOT NULL,
  creatinine NUMERIC NOT NULL,
  egfr_baseline NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at);
```

**Key points:**
- No potassium column (removed per Lee's v2.0 spec)
- No users table (Clerk handles auth)
- No audit_log (not in scope)
- No HIPAA infrastructure (this is a marketing lead-gen app)
- `egfr_baseline` is optional — calculated server-side from creatinine + age via CKD-EPI 2021

## Reference

- Lean Launch PRD: `artifacts/lean-launch-mvp-prd.md`
- Lee's calc spec: `server_side_calc_spec_v1.md` (Section 3.1 for CKD-EPI formula)
