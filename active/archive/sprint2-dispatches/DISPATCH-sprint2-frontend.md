# DISPATCH: Sprint 2 Frontend — Harshit

**Date:** 2026-03-27
**From:** Luca (CTO / Orchestrator)
**To:** Harshit (Frontend Developer)
**Sprint:** Sprint 2 — Core Flow (Mar 26 -- Apr 2)

---

## Status Summary

You have two HIGH-priority tracks ready to start in parallel. PR #12 (LKID-1, Clerk auth magic link redirect) is still open — finish that first if it is close to done, then move to the tracks below. These two tracks are independent; work them in parallel or sequence at your discretion.

---

## Track 1: LKID-16 — Build Prediction Form with Lab Value Inputs

**Card:** LKID-16
**Priority:** HIGH — this is the core user-facing form
**Branch:** `feat/LKID-16-prediction-form`
**Skill to invoke:** Use `/frontend-design` for the form UI

### Requirements

Build the patient input form with these field groups:

**Required fields (4 lab values + demographics):**
- BUN (mg/dL) — range 5--150
- Creatinine (mg/dL) — range 0.3--15.0
- Potassium (mEq/L) — range 2.0--8.0
- Age (years) — range 18--120
- Sex — radio group: Male / Female / Prefer not to say (enum: `"male"`, `"female"`, `"unknown"`)

**Optional fields (Tier 2 unlock — BOTH required for upgrade):**
- Hemoglobin (g/dL) — range 4.0--20.0
- Glucose (mg/dL) — range 40--500

**Progressive disclosure:** Required fields first, then "Add more labs to improve accuracy" expandable section for optional fields. Unlock prompt: "Add hemoglobin AND glucose to improve prediction accuracy" (Decision #12 — both required for Tier 2).

### Known Issue — Age Max

Frontend age max is currently 100 but the backend and DB accept 120. **Fix the frontend validation to allow age up to 120** as part of this work. Check `app/src/lib/validation.ts` and update accordingly.

### Stack and Patterns

- shadcn/ui form components + Tailwind styling
- React Hook Form (or equivalent) for form state and validation
- Client-side validation with min/max ranges per field
- Inline field-level error messages mapped from API error schema (Decision #9): `details[].field` maps to form fields
- Disabled submit until all required fields pass validation
- Error response mapping per John's guidance in `agents/john_donaldson/drafts/api_docs.md` Section 6

### References

- Inga's component specs: `agents/inga/drafts/component-specs.md`
- Existing validation rules: `app/src/lib/validation.ts`
- API contract (request schema): `agents/john_donaldson/drafts/api_contract.json`
- Your own component tree: `agents/harshit/drafts/frontend_architecture.md` Section 3
- API error mapping: `agents/john_donaldson/drafts/api_docs.md` Section 6

### Acceptance Criteria

1. All 5 required fields render with proper labels, placeholders, and units
2. Client-side validation enforces correct ranges (age max = 120, not 100)
3. Optional fields are behind a collapsible "Add more labs" section
4. Submit is disabled until all required fields pass
5. Field-level error messages display inline on validation failure
6. Form is responsive: works on mobile (<768px), tablet (768--1024px), desktop (>1024px)
7. Touch targets are minimum 44px for all interactive elements
8. `data-testid` attributes on all interactive elements (Yuri needs these for test scaffolding)

---

## Track 2: LKID-19 — Build Visx Chart with 4 Trajectory Lines

**Card:** LKID-19
**Priority:** HIGH — this is the core visualization
**Branch:** `feat/LKID-19-visx-chart`
**Skill to invoke:** Use `/frontend-design` for the chart component

### Requirements

Build the eGFR trajectory chart using Visx with these specifications:

**Chart structure:**
- 4 trajectory lines: No Treatment, BUN 18--24, BUN 13--17, BUN <=12
- 15 data points at non-uniform intervals: 0, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120 months
- X-axis: True linear time scale in months (Decision #5) — first year is intentionally compressed
- Y-axis: eGFR (mL/min/1.73m2), min 0, max = highest bun12 value + 12 buffer
- Dialysis threshold: horizontal dashed red line at eGFR 12

**Line styles (from spec Section 4.4):**
- No Treatment: `#AAAAAA` dashed (7px/4px)
- BUN 18--24: `#85B7EB` short dash (3px/2px)
- BUN 13--17: `#378ADD` solid
- BUN <=12: `#1D9E75` solid, heaviest weight

**Additional elements:**
- Phase bands: Phase 1 (months 0--3) gray, Phase 2 (months 3--24) light green, rendered below lines
- Start/end labels: filled dot at index 0, end-of-line eGFR values with 15px minimum vertical separation (collision avoidance)
- Confidence tier badge: top-right corner, 3 tiers with distinct visual states
- Stat cards below chart: 4-column grid (No Treatment, BUN 18--24, BUN 13--17, BUN <=12), each with 3px top border in line color

### Mock Data

Use mock data for now — the backend `/predict` endpoint is not ready yet. **Structure mock data to match the API contract response shape** from `agents/john_donaldson/drafts/api_contract.json`.

The response shape you need to mock:

```json
{
  "egfr_calculated": 38,
  "confidence_tier": 2,
  "unlock_prompt": "Add 2 more visit dates to unlock trend analysis.",
  "trajectories": {
    "none": [38, 36, 34, 32, 30, 27, 24, 19, 16, 13, 11, 10, 9, 8, 7],
    "bun24": [38, 37, 37, 36, 36, 35, 35, 34, 33, 33, 32, 32, 31, 31, 30],
    "bun17": [38, 38, 39, 40, 41, 42, 44, 46, 48, 49, 50, 51, 51, 52, 52],
    "bun12": [38, 39, 41, 43, 46, 49, 53, 58, 62, 65, 67, 68, 69, 70, 71]
  },
  "time_points_months": [0, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120],
  "dial_ages": { "none": 68, "bun24": null, "bun17": null, "bun12": null },
  "slope": null,
  "slope_description": null,
  "visit_count": 1,
  "created_at": "2026-03-25T12:00:00Z"
}
```

### References

- Inga's wireframes: `agents/inga/drafts/` (check for chart-related wireframes)
- API contract response shape: `agents/john_donaldson/drafts/api_contract.json` and `agents/john_donaldson/drafts/api_docs.md` Section 4.11
- Yuri's test strategy Section 9e for visual regression requirements: `agents/yuri/drafts/test_strategy.md`
- Your Visx architecture plan: `agents/harshit/drafts/frontend_architecture.md` Section 5

### Acceptance Criteria

1. 4 trajectory lines render with correct colors and dash patterns
2. X-axis uses true linear time scale (months), with first year compressed as designed
3. Y-axis shows eGFR with proper range and dialysis threshold line at 12
4. Phase bands render below trajectory lines
5. End-of-line labels avoid collisions (15px minimum vertical separation)
6. Stat cards render below chart in 4-col grid (desktop), 2x2 (tablet), single stack (mobile)
7. Chart renders from mock data matching the API contract shape
8. `data-testid` attributes on chart container and stat cards

---

## Coordination Notes

- **Inga** is available as co-owner for design review on both tracks. Ping her for visual sign-off before marking cards as done.
- **Yuri** will be writing test scaffolding for these components as you build them. Coordinate on component boundaries and ensure `data-testid` attributes are in place early.
- **John Donaldson** is building the `/predict` endpoint (LKID-15) in parallel. The API contract shape above is what he is targeting. When his endpoint is ready, swapping from mock data to real API calls should be a clean integration.
- **PR #12** (LKID-1, Clerk auth) — if close to done, finish it first. If it is blocked, park it and move to these tracks.

---

*Dispatched by Luca — 2026-03-27*
