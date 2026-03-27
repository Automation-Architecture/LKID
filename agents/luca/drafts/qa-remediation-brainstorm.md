# QA Remediation Brainstorm -- PRs #14, #15, #16, #17

**Facilitator:** Luca (CTO)
**Participants:** John Donaldson (API), Gay Mark (DB), Harshit (Frontend), Yuri (QA)
**Date:** 2026-03-27
**Status:** BINDING -- decisions below are final. Agents must implement exactly as specified.
**Input:** Yuri's batch QA report (`agents/yuri/drafts/qa-batch-prs-14-17.md`)

---

## 1. Binding Validation Range Table

This is the single authoritative reference. ALL layers must match these ranges exactly. No layer may deviate without a new decision.

| Field | Min | Max | Unit | Type | Required | Source |
|-------|-----|-----|------|------|----------|--------|
| BUN | 5 | 150 | mg/dL | float | Yes | API contract Section 5, calc spec test vectors |
| Creatinine | 0.3 | 15.0 | mg/dL | float | Yes | API contract Section 5, CKD-EPI clinical range |
| Potassium | 2.0 | 8.0 | mEq/L | float | Yes | API contract Section 5 |
| Age | 18 | 120 | years | integer | Yes | API contract Section 5 |
| Sex | male, female, unknown | -- | enum | string | Yes | Decision #3, API contract Section 5 |
| Hemoglobin | 4.0 | 20.0 | g/dL | float | Optional (Tier 2) | API contract Section 5 |
| Glucose | 40 | 500 | mg/dL | float | Optional (Tier 2) | API contract Section 5 |

### Layer-by-Layer Alignment Status

| Layer | File | Current Status | Action Required |
|-------|------|----------------|-----------------|
| **API Contract** | `agents/john_donaldson/drafts/api_docs.md` | Matches binding table | None |
| **Pydantic (main)** | `backend/main.py` (main branch) | Matches binding table | None |
| **Pydantic (PR #16)** | `backend/main.py` (PR #16 branch) | DIVERGES -- widened ranges | Revert to match binding table |
| **DB CHECK** | `agents/gay_mark/drafts/db_schema.sql` | Matches for stored fields (BUN, creatinine, age) | None |
| **Frontend** | `app/src/lib/validation.ts` | DIVERGES -- creatinine 0.1-25, BUN integer:true, missing fields | Update per Section 5 below |
| **Fixtures (PR #16)** | Backend + frontend factories | Will align after Pydantic revert | Update boundary helpers |

### Clinical Rationale

- **Creatinine 0.3-15.0:** Below 0.3 is not clinically observed in adults. Above 15.0 is extreme late-stage dialysis; the app targets pre-dialysis patients. The API contract and DB both use 0.3-15.0.
- **BUN 5-150:** BUN above 100 is clinically plausible in CKD Stage 5. Calc spec test Vector 2 uses BUN 53. Capping at 100 would reject real patients.
- **Hemoglobin 4.0-20.0:** Below 4.0 is life-threatening (ICU). Above 20.0 is polycythemia. The modifier only triggers at < 11.
- **Glucose 40-500:** Below 40 is severe hypoglycemia. Above 500 is diabetic emergency. Standard lab reporting bounds.

---

## 2. Decision: PR #16 Pydantic Range Revert

**Problem:** PR #16 widened Pydantic ranges (creatinine to 0.1-25.0, BUN max to 100, hemoglobin to 3.0-25.0, glucose to 20-600) without updating the API contract. These new ranges conflict with DB CHECK constraints and the approved contract.

**Decision:** Revert all Pydantic range changes in PR #16 to match the binding table above.

| Field | PR #16 Current | Revert To |
|-------|----------------|-----------|
| BUN max | 100 | 150 |
| Creatinine min | 0.1 | 0.3 |
| Creatinine max | 25.0 | 15.0 |
| Hemoglobin min | 3.0 | 4.0 |
| Hemoglobin max | 25.0 | 20.0 |
| Glucose min | 20 | 40 |
| Glucose max | 600 | 500 |

Also remove the unused `TrajectoryPoint` model added in PR #16 (PR16-02 finding).

---

## 3. Decision: PR #15 Rebase Strategy

**Problem:** PR #15 (`feat/LKID-11-leads-write`) was branched from a stale main before LKID-15 merged. Its `PredictRequest` only has 5 fields and calls `run_prediction()` instead of `predict_for_endpoint()`. Merging as-is would regress the model.

**Decision:** Rebase onto current main. Do NOT close and re-branch.

**Rebase plan:**

1. Wait for PR #16 to merge first
2. `git fetch origin && git rebase origin/main`
3. Expected conflict in `main.py` around the `predict()` function body
4. Resolution: keep current main's `predict()` body (which calls `predict_for_endpoint()` with 7 args), then add the lead-capture `asyncio.create_task(_write_lead(...))` after the prediction result line
5. The lead-capture function `_write_lead()` and JWT helper `_extract_email_from_jwt()` should apply cleanly as new additions

**Additional fix during rebase (PR15-04):**

```python
# Add segment count check before accessing parts[1]
def _extract_email_from_jwt(token: str) -> Optional[str]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload = base64.b64decode(parts[1] + "==")
        ...
```

**Deferred (PR15-05):** No potassium or sex in leads table. This is a feature gap, not a bug. The leads table schema is intentionally minimal. If marketing needs these fields, that is a separate Jira card.

---

## 4. Decision: Merge Order

```
PR #16 (fixtures + CI) --> PR #15 (leads write, rebased) --> PR #14 (form) --> PR #17 (k6 + visual)
```

**Dependency chain:**

1. **PR #16 first** -- Establishes canonical fixture library. After Pydantic range revert and dead code removal, this is safe to merge. Verdict: APPROVED WITH NOTES becomes APPROVED after fixes.
2. **PR #15 second** -- Must rebase onto main after PR #16 merges. The lead-capture logic is sound; only the stale base is the problem. After rebase + JWT fix, merge.
3. **PR #14 third** -- Frontend form depends on knowing the final ranges (now resolved) and the error envelope format (see Section 5). After Harshit's fixes, merge.
4. **PR #17 last** -- Must rebase onto PR #16 to resolve factory file conflicts. Rename `create_*` imports to `make_*`. After rebase + factory alignment, merge.

**Should any PRs be combined?** No. Each PR maps to distinct Jira cards. Combining would lose traceability and complicate code review. The rebase strategy handles cross-PR dependencies cleanly.

---

## 5. Action Items Per Agent

### Yuri -- PR #16 and PR #17

**PR #16 fixes (before merge):**

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 1 | PR16-01: Pydantic ranges conflict with DB CHECK | Revert all Pydantic ranges to match binding table (Section 1) | HIGH |
| 2 | PR16-02: Unused TrajectoryPoint model | Remove `class TrajectoryPoint(BaseModel)` from main.py | MEDIUM |
| 3 | PR16-03: Frontend Lead.id is number, DB uses UUID | Change `Lead.id` to `string`, generate UUID strings in factory | MEDIUM |
| 4 | PR16-04: ErrorResponse code mismatch | Change `"RATE_LIMIT"` to `"RATE_LIMIT_EXCEEDED"` in frontend types | LOW |
| 5 | Fixture boundary helpers | Update `make_predict_request_at_min()` and `_at_max()` to use binding table ranges | HIGH |

**PR #17 fixes (after PR #16 merges):**

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 6 | PR17-01: Duplicate factory files | Rebase onto main, delete PR17's factories.py, import from PR16's `make_*` factories | MEDIUM |
| 7 | PR17-02: Visual regression tests depend on sessionStorage | Add `page.evaluate(() => sessionStorage.setItem('prediction_result', JSON.stringify(mockData)))` before navigation, OR add TODO comment if results page not yet built | MEDIUM |
| 8 | PR17-03: lab_entries_load.js targets non-existent endpoint | Gate behind `__ENV.ENABLE_LAB_ENTRIES` check; skip with console log if not set | LOW |

### John Donaldson -- PR #15

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 1 | PR15-01 + PR15-02: Stale base (regresses PredictRequest and predict call) | Rebase onto main after PR #16 merges. Resolve conflicts by keeping current main's predict() body, adding lead-capture task after | HIGH |
| 2 | PR15-04: JWT decode missing segment count check | Add `if len(parts) != 3: return None` before `parts[1]` access | MEDIUM |
| 3 | Verify lead write column names still match after rebase | Confirm INSERT columns (email, name, age, bun, creatinine, egfr_baseline) still align with Gay Mark's leads table | MEDIUM |

### Harshit -- PR #14

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 1 | PR14-01 + PR14-02: Frontend ranges diverge from binding table | Update `validation.ts` PREDICT_FORM_RULES per binding table. Creatinine: min 0.3, max 15.0. BUN: keep 5-150 but remove `integer: true` | HIGH |
| 2 | Missing validation rules | Add rules for: potassium (required, 2.0-8.0), sex (required, enum), hemoglobin (optional, 4.0-20.0), glucose (optional, 40-500) | HIGH |
| 3 | PR14-04: Error envelope parsing | Change from `body.detail[].field + .msg` to `body.error?.details?.forEach(d => errors[d.field] = d.message)` | MEDIUM |
| 4 | PR14-03: Single Tier 2 field silently dropped | Add inline helper text: "Both hemoglobin and glucose are needed to improve prediction confidence" when only one is filled | MEDIUM |
| 5 | PR14-05: Duplicate DOM rendering | Replace dual hidden/shown field sets with a single responsive grid (`grid-cols-1 md:grid-cols-2`) | LOW |
| 6 | Remove `name` from PREDICT_FORM_RULES | Name is for lead capture, not prediction. Remove from validation.ts prediction rules if the form no longer collects name inline | LOW |

### Gay Mark -- DB Schema

| # | Item | Action | Priority |
|---|------|--------|----------|
| 1 | DB CHECK constraints already match binding table | No migration needed | -- |
| 2 | leads table is intentionally minimal | No changes. potassium/sex are not stored in leads. | -- |
| 3 | Future: if marketing needs potassium/sex on leads | Create a new Jira card, new Alembic migration | Deferred |

---

## 6. Error Envelope Parsing -- Detailed Fix Map

For Harshit's reference. The backend (Decision #9) returns:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields failed validation.",
    "details": [
      { "field": "creatinine", "message": "Creatinine must be between 0.3 and 15.0 mg/dL." },
      { "field": "age", "message": "Age must be between 18 and 120." }
    ]
  }
}
```

The frontend must parse it as:

```typescript
// After fetch() response:
if (!response.ok) {
  const body = await response.json();
  const apiErrors: Record<string, string> = {};

  if (body.error?.details && Array.isArray(body.error.details)) {
    for (const detail of body.error.details) {
      if (detail.field) {
        apiErrors[detail.field] = detail.message;
      }
    }
  }

  // If no field-level errors parsed, show the top-level message
  if (Object.keys(apiErrors).length === 0) {
    apiErrors._form = body.error?.message || "An unexpected error occurred.";
  }

  return apiErrors;
}
```

Key differences from current PR #14 code:
- `body.error.details` not `body.detail`
- `.message` not `.msg`
- Top-level message at `body.error.message` for generic display
- Error code at `body.error.code` for programmatic handling (e.g., show retry for `RATE_LIMIT_EXCEEDED`)

---

## 7. Checklist Before Each Merge

Before approving any PR, verify:

- [ ] All validation ranges in that PR match the binding table (Section 1)
- [ ] Error responses use the Decision #9 envelope structure
- [ ] No Pydantic model regressions (PredictRequest has all 7 input fields + 2 lead fields)
- [ ] `predict()` calls `predict_for_endpoint()` with 7 args
- [ ] Fixtures use `make_*` naming (not `create_*`)
- [ ] Frontend types use `"RATE_LIMIT_EXCEEDED"` (not `"RATE_LIMIT"`)

---

*Brainstorm facilitated by Luca (CTO) -- 2026-03-27*
*This document is binding. Agents must implement exactly as specified.*
