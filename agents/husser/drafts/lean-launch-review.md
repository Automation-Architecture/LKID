# Lean Launch Profile Review — Husser (PM)

**Date:** 2026-03-25
**Status:** Approved with one decision rendered

---

## Business Model Reframe: Lead Gen, Not Patient Portal

Approved. This is the right call. The original PRD was built around a patient portal mental model — accounts, dashboards, multi-visit tracking, HIPAA compliance apparatus — none of which serves the actual business goal: capture warm leads who self-identify as CKD patients by giving them a useful tool.

The value exchange is clean: patient gets a trajectory chart and PDF, we get name + email + lab context for a targeted email campaign. No ongoing relationship in the app itself.

---

## Scope Cuts: What We Lose vs. What Matters

**Nothing critical is lost.** The cuts fall into three buckets:

1. **Retention features without a retention model** — accounts, dashboards, multi-visit tracking, slope analysis. These only matter if users come back. In a lead-gen model, they don't. Correct to defer.
2. **Compliance overhead without compliance risk** — HIPAA suite, audit logging, KMS encryption, purge cron, RBAC roles. We're not storing PHI long-term. A `leads` table with name/email/lab values/timestamp is marketing data, not a medical record. Correct to defer.
3. **Engineering complexity without user value** — confidence tiers, stat cards, unlock prompts, Schemathesis, visual regression, 90%/85% coverage thresholds. Gold-plating for an MVP. Correct to defer.

**One flag:** The original PRD listed PDF export as deferred to Phase 2b. The lean profile promotes it to KEEP. This is correct — it's the deliverable the user walks away with — but the team should note this is new scope relative to PRD v1, not a carry-over.

---

## Decision: Email Campaign Integration

**Decision:** Store leads in the `leads` table and expose a webhook endpoint. No direct email provider integration in MVP.

**Rationale:**

| Option | Verdict | Why |
|--------|---------|-----|
| Direct API to Klaviyo/Instantly | Reject | Couples the app to a provider we haven't chosen. Adds API key management, error handling, retry logic. Overkill for launch. |
| Zapier/Make webhook | Reject for MVP | Adds a paid dependency and another failure point before we even know if the funnel converts. |
| Leads table + batch export | **Accept as baseline** | Already in the schema. CSV export or `SELECT *` gives us everything we need to import into any tool manually. Zero additional code. |
| Supabase edge function trigger | Reject | Only relevant if Luca picks Supabase. Don't couple a product decision to an infra decision. |

**Implementation:**

1. `POST /predict` writes to `leads` table (name, email, lab values, timestamp) as a side effect of every prediction. This is already implied by the lean profile.
2. No webhook, no integration, no cron job at launch.
3. PM (me) manually exports leads weekly and imports into whatever email tool we pick. At our expected launch volume, this is fine.
4. Phase 2: Add a webhook or direct integration once we've chosen a provider and validated the funnel.

**Why not automate now?** Because we don't know which email tool we're using, we don't know our volume, and we don't know if the funnel converts. Manual export costs 10 minutes/week. Premature automation costs days of engineering and a provider commitment.

---

## Open Items for Other Agents

- **Luca:** Hosting + auth provider decisions are blocking. Need those before sprint planning.
- **John Donaldson:** PDF generation approach — recommend server-side (weasyprint) to avoid client-side rendering inconsistencies. Your call on implementation.
- **Gay Mark:** `leads` table schema is simple. Confirm: `id (UUID), name, email, lab_values (JSONB), created_at`. No FK to any auth table.
- **Yuri:** Simplified test strategy is acceptable. Prediction engine unit tests are non-negotiable — that's the IP. Critical path E2E (form -> predict -> chart -> PDF) covers the money flow.

---

## Summary

The lean launch profile is approved. 75% ticket reduction with zero loss of launch-critical functionality. Ship the lead gen tool, validate the funnel, then invest in retention features only if the data says to.
