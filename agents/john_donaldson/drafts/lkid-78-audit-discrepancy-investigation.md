# LKID-78 Audit Discrepancy Investigation

**Date:** 2026-04-20
**Investigator:** John Donaldson (this agent)
**Read-only investigation — no code changes.**

## Summary

- **Root cause:** The LKID-78 ticket conflates two different numbers. There is no "32" displayed on the live Results page for the audit inputs — that "32" is **hardcoded copy in the design mockup** at `project/Results.html:544` ("Your reported eGFR is 32. … Your estimated structural capacity is eGFR 38."). The deployed app does not render 32; it renders the engine-computed baseline. My LKID-76 static number of 43.9 was also wrong — I used `sex="male"`, but the Lab Form hardcodes `sex: "unknown"` (no sex field exists on the form) and the unknown-sex CKD-EPI branch averages male+female, yielding **38.4** (rendered as "38"). So the real discrepancy is a three-way mismatch: design mockup = 32 (female branch), my LKID-76 note = 43.9 (male branch), live app = 38 (unknown-sex average). Hypothesis #1 is correct — the "stale/misread value" is the designer's hardcoded mockup copy, not an audit observation.
- **Severity:** working-as-intended (engine + display). The LKID-78 ticket description itself is the defect — it misreads `project/Results.html:544` as an audit finding.
- **Fix path:** No engine or app fix. Correct the LKID-78 ticket premise; optionally update the design mockup (`project/Results.html:544`) so the hardcoded "32 / 38" matches the unknown-sex engine output for these inputs ("38 / 45"), or rewrite the sentence with placeholder braces so nobody mistakes it for real output again.

## Findings

### Engine behavior — creatinine-only inputs

`compute_egfr_ckd_epi_2021(creatinine=1.8, age=55, sex=<s>)` returns:

| sex input      | eGFR  | Notes |
|----------------|-------|-------|
| `"male"`       | 43.9  | This is what I computed in LKID-76 — wrong sex. |
| `"female"`     | 32.9  | Rounds to 33; the design mockup's hardcoded "32" is close to this. |
| `"unknown"`    | 38.4  | Average of male+female branches. **This is what the app actually sends and displays.** |

Reproduction (backend/prediction/engine.py on `main`):

```
sex=male     eGFR: 43.9
sex=female   eGFR: 32.9
sex=unknown  eGFR: 38.4
```

For audit inputs with `sex="unknown"`, `predict_for_endpoint` returns:

```
egfr_baseline     : 38.4
structural_floor  : {'structural_floor_egfr': 44.8, 'suppression_points': 6.4}
```

So the live Results page, on these inputs, renders (ResultsView.tsx:328–334):

> "Your reported eGFR is **38**. At your current BUN of **35**, approximately **6** points of that reading reflect BUN workload suppression, not permanent damage. Your estimated structural capacity is eGFR **45**."

### Engine behavior — creatinine + reported eGFR

`predict()` accepts `egfr_entered`: if provided, it bypasses CKD-EPI and uses the entered value as `egfr_baseline`. `predict_for_endpoint()` — which is what the HTTP layer actually calls (`backend/main.py:506` and `:1044`) — **does not** accept `egfr_entered`. The Lab Form has no eGFR input field either (BUN / Creatinine / Potassium / Age only — see `app/src/app/labs/page.tsx:420` which hardcodes `sex: "unknown"` alongside the payload). So the production dispatch path is creatinine-only; there is no "reported vs. computed" distinction in the live product. `egfr_entered` exists purely for the test harness and Lee's golden-vector fixtures (`backend/tests/test_prediction_engine.py`).

### Audit's stated baseline "32"

The audit (`agents/luca/drafts/ui-design-audit-sprint5.md`) **never** records "32" as an observed baseline. The audit's Results-page finding list is P0s about nav/title/pills/cards/kidney visual/download pill/edit pill/footer and P1s about chart palette/labels — no mention of the baseline value. The only mention of "32" in the audit file is `32px` font-size for scenario-card numerics (lines 80, 138). The chart end-point values observed by the audit's headless-browser screenshot were "42/30/28/14" (audit line 71), consistent with an `egfr_baseline=38.4` start (no-treatment trajectory hits ~14 at 10yr, treatment trajectories end 42/30/28 under phase-1 bumps — shape matches a baseline in the 38 range, not 32).

The number "32" appears exclusively in the design mockup `project/Results.html:544`:

```html
<p>Your reported eGFR is 32. At your current BUN of 35, approximately 6 points
of that reading reflect BUN workload suppression, not permanent damage. Your
estimated structural capacity is eGFR 38.</p>
```

This is literal, unparameterized HTML in the designer's static sample — Inga's demo copy — not something the app renders. The "32 / 38" pair in that mockup happens to match `sex="female"` CKD-EPI output for these inputs (32.9 rounded, and a structural-floor of ~39 if you re-base the floor formula on 32.9 instead of 38.4), which is probably how Inga picked it.

### Design intent — project/Results.html:544

The design does articulate a two-number concept: **reported eGFR** (what the lab says, i.e., the baseline eGFR computed from creatinine) and **structural capacity** (the BUN-adjusted structural floor). The deployed app **honors this distinction correctly** — `ResultsView.tsx:265–281` and `:322–342` render exactly this two-number sentence using `egfrBaseline` (= `result.egfr_baseline`, the computed CKD-EPI value) and `structuralFloor.structural_floor_egfr`. The rendering is gated on `suppression_points >= 0.5` so the callout only shows when there's real suppression headroom, which is correct for these inputs (6.4 points).

There is no "reported vs. computed" bifurcation in the engine — "reported" in the design's language is shorthand for the baseline (whether that baseline came from a lab report the user typed or from CKD-EPI on creatinine doesn't change the label). Since the app doesn't accept a user-entered eGFR, "reported" always = "CKD-EPI-computed".

## Verdict

**WAI — no engine bug, no display bug.** The LKID-78 ticket is founded on a misreading of the design mockup. What's really going on:

1. The designer's mockup at `project/Results.html:544` contains hardcoded demo numbers ("32 / 6 / 38") that match the `sex="female"` branch for the audit inputs, not the `sex="unknown"` branch the app actually uses.
2. The LKID-76 static number I quoted (43.9) was computed with `sex="male"`, not `sex="unknown"`, so it also doesn't match what the app shows.
3. The actually-displayed baseline for audit inputs is **38** (from 38.4), with a structural-capacity reading of **45** (from 44.8) — both correct per engine + design-intent.

## Recommendation

Three small items, no code changes to prod.

1. **Close LKID-78 as "not a bug."** Document in the ticket that "32" was the design mockup's hardcoded string, not a live-app observation, and that the live baseline for audit inputs is 38 with `sex="unknown"`. My LKID-76 static calc used `sex="male"` and should be re-done with `sex="unknown"` for parity; the corrected LKID-76 baseline is 38.4. **Owner:** Luca (ticket housekeeping) + me (correct the LKID-76 sign-off note).
2. **Optional design-mockup cleanup.** Update `project/Results.html:544` either to (a) match the unknown-sex engine output for its demo inputs ("Your reported eGFR is **38**. … 6 points … structural capacity is eGFR **45**.") or (b) use placeholder braces (`{egfr}`, `{suppression}`, `{structural}`) so the static HTML can't be mistaken for live output again. **Owner:** Inga.
3. **Future audit protocol.** When an audit reports a numeric discrepancy on a screen, quote the source — screenshot pixel / DOM text / mockup line — so we don't chase phantom bugs. The Sprint-5 audit file is good about this for most findings but the LKID-78 premise was extracted into the ticket without a source citation. **Owner:** Luca / Husser for the auditor-dispatch template.

---

**Key file paths referenced:**
- Engine: `backend/prediction/engine.py:82-92` (CKD-EPI), `:433-474` (`predict`), `:482-540` (`predict_for_endpoint`)
- HTTP dispatch: `backend/main.py:506-516` (POST /predict → `predict_for_endpoint`), `:1044-1054` (PDF path)
- Frontend form: `app/src/app/labs/page.tsx:420` (`sex: "unknown"` hardcoded; no eGFR field)
- Results render: `app/src/components/results/ResultsView.tsx:265-281`, `:322-342`
- Audit source: `agents/luca/drafts/ui-design-audit-sprint5.md` (no "32" baseline finding anywhere)
- Design mockup with hardcoded "32": `project/Results.html:544`

---

## Addendum 2026-04-20 — sex collection decision (Brad / Lee)

The `sex: "unknown"` hardcode at `app/src/app/labs/page.tsx:420` is **intentional and permanent**: Lee does not want to collect patient sex on the form. The engine's `compute_egfr_ckd_epi_2021` averages the male + female CKD-EPI coefficients when `sex="unknown"`, so every production request hits the sex-averaged branch.

Code comments mirroring this decision were added in the same session:

- `app/src/app/labs/page.tsx:420` — inline comment explaining the hardcode
- `backend/prediction/engine.py:compute_egfr_ckd_epi_2021` docstring — note at the engine side

Decision owner: Brad (passing through Lee's preference). Do not reopen without Lee's explicit consent.
