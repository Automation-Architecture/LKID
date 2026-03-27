# Medical-Scientific Review: KidneyHood Prediction Engine

**Reviewer:** Independent nephrologist / clinical data scientist
**Date:** 2026-03-26
**Documents reviewed:**
1. `server_side_calc_spec_v1.md` (Lee's calc spec)
2. `finalized-formulas.md` (Donaldson's reconciliation)
3. `TASK-iterate-rules-engine-v3.md` (formula discrepancy analysis)
4. `prediction_engine.py` (Python implementation)
5. `test_prediction_engine.py` (Donaldson's test vectors)
6. `test_golden_file.py` (Yuri's comprehensive test suite)

---

## 1. Executive Summary

The KidneyHood prediction engine implements a two-phase recovery model for CKD patients undergoing BUN reduction therapy, projecting 10-year eGFR trajectories across four treatment scenarios. The underlying clinical framework -- that elevated BUN exerts a reversible suppressive effect on measured eGFR via tubular transport competition, and that sustained BUN reduction permits structural tubular recovery -- has a physiological basis, but the quantitative coefficients and projected magnitudes carry significant uncertainty that must be communicated to patients. The model is best understood as a hypothesis-generating educational illustration derived from a single-center pilot cohort, not a validated prognostic instrument.

The no-treatment decline rates are broadly consistent with published CKD epidemiology (Coresh 2014, CRIC, CKD Prognosis Consortium), though the linear decline assumption is a known simplification. The Phase 1 BUN-eGFR coupling (0.31 points per mg/dL) is within the range reported in cross-sectional studies, but applying it as a causal treatment effect requires caution. The Phase 2 structural recovery claims (+4 to +8 eGFR points over 21 months) are the most aggressive element of the model and rest on pilot data that has not been independently replicated. The post-treatment decline rates (-0.5 to -1.5 mL/min/yr) are optimistic relative to published long-term CKD cohort data, even for well-managed patients.

The most consequential concern for a patient-facing tool is the risk of therapeutic overestimation -- particularly in Test Vector 2 (Stage 5, eGFR 10), where the model projects a +17.4 point recovery to eGFR 27.4 with BUN reduction alone. While such recoveries have been reported anecdotally in patients with significant reversible components, projecting this as a typical outcome for Stage 5 CKD patients could delay appropriate referral for renal replacement therapy planning. The disclaimers in the current spec are insufficient for this risk level.

---

## 2. Section-by-Section Findings

### 2.1 CKD-EPI 2021 Implementation

**Verdict: CAUTION**

The CKD-EPI 2021 equation is the correct contemporary choice (race-free, as published by Inker et al., NEJM 2021). However, the spec uses a "sex-free population average" with kappa=0.9 and alpha=-0.302, which are actually the **male** coefficients. The female coefficients are kappa=0.7 and alpha=-0.241. A true population average would be an average of the male and female equations weighted by expected sex distribution, not simply using the male parameters.

**Quantitative impact:** For a female patient with creatinine 1.5 mg/dL at age 60, the male-parameter equation yields eGFR ~40, while the sex-specific female equation yields eGFR ~35. This is a clinically meaningful 5-point discrepancy that could shift CKD staging. For male patients, the equation is accurate.

**Recommendation:** This is acceptable for a marketing app that does not collect sex, but the Tier 1 confidence badge must clearly state that the eGFR calculation is approximate. Better yet, strongly encourage patients to enter their lab-reported eGFR (which their lab already calculates with sex-specific coefficients) rather than relying on the built-in calculation. The current implementation correctly allows `egfr_entered` to bypass the CKD-EPI calculation -- make this the primary path in the UX.

**Age bounds (18-100):** Clinically valid. CKD-EPI 2021 was validated in adults 18+. The equation becomes less reliable above age 90 due to sarcopenia-related low creatinine, but age 100 as an upper bound is reasonable for a marketing tool. Pediatric patients (age <18) must be excluded -- the implementation does not enforce this. Add input validation.

### 2.2 No-Treatment Decline Model

**Verdict: VALID with CAUTION**

**Stage-specific decline rates:**

| CKD Stage | Spec Rate | Published Literature | Assessment |
|-----------|-----------|---------------------|------------|
| 3a | -1.8 mL/min/yr | -1.0 to -2.5 (Coresh 2014 median ~-1.5) | Slightly pessimistic but within range |
| 3b | -2.2 mL/min/yr | -1.5 to -3.0 (CKD-PC meta-analysis) | Reasonable central estimate |
| 4 | -3.0 mL/min/yr | -2.0 to -5.0 (CRIC cohort, highly variable) | Reasonable |
| 5 | -4.0 mL/min/yr | -3.0 to -8.0 (MDRD, highly variable) | Conservative end; many Stage 5 patients decline faster |

These rates are defensible as population averages, though individual variation is enormous (SD typically exceeds the mean decline rate). The key issue is that **CKD decline is not linear**. Published data from CRIC and the Toronto CKD Cohort show that many patients experience periods of stability punctuated by episodes of acute decline. The linear model is a mathematical convenience that works acceptably for 10-year projections at the population level but poorly predicts individual trajectories.

**BUN modifier (0.15 per 10 mg/dL above 20):** The Seki 2019 reference (BUN as independent predictor of ESRD) supports the direction of this modifier. However, 0.15 mL/min/yr per 10 mg/dL is modest. Seki reported hazard ratios of approximately 1.3-1.5 per 10 mg/dL BUN increase for ESRD, which would correspond to a somewhat larger rate modifier in a continuous model. The conservative sizing is appropriate for a marketing tool -- underestimating the no-treatment decline means underestimating the treatment benefit differential, which is the safer direction for patient communication.

**Concern:** The BUN modifier as implemented makes the decline rate MORE negative as BUN increases. This is correct directionally. But in the code, `annual_decline = base_rate - bun_modifier` where `base_rate` is already negative and `bun_modifier` is positive, producing a more negative total. Verified correct.

### 2.3 Phase 1 -- BUN Suppression / Functional Recovery (Months 0-3)

**Verdict: CAUTION**

**The 0.31 coefficient:** The spec cites Spearman rho = -0.692 (p = 1.33e-28) from 191 pooled observations showing same-visit BUN-eGFR lockstep. A correlation of -0.69 is strong for biological data and is consistent with published cross-sectional studies of BUN-eGFR relationships. However:

1. **Correlation is not causation.** The -0.69 correlation reflects the fact that BUN and eGFR are mathematically linked (BUN rises as GFR falls because the kidney clears urea). The 0.31 coefficient assumes that *reducing* BUN will *cause* eGFR to rise by the same slope observed cross-sectionally. This is only true for the fraction of the BUN-eGFR relationship that is mediated by reversible tubular transport competition (OAT/OCT pathway effects). Some of the correlation is simply the algebraic relationship between GFR and BUN clearance. The 0.31 coefficient likely overestimates the causal treatment effect.

2. **Comparison with v2.0 formula:** The v2.0 formula (`phase1_suppression = eGFR * 0.08`) is more physiologically grounded. It says that approximately 8% of measured eGFR is suppressed by uremic toxin competition at tubular transporters. This is consistent with published estimates of tubular contribution to creatinine clearance (10-15% at normal GFR, rising in CKD). The 8% figure is conservative and defensible.

3. **The exponential saturation curve** (`1 - exp(-2.5*t/3)`) reaching ~92% by month 3 is clinically reasonable for dietary BUN response. With strict protein restriction or dietary intervention, BUN typically drops 30-50% within 2-4 weeks and stabilizes by 8-12 weeks. The exponential approach captures this well.

4. **Phase 1 caps (12, 9, 6 eGFR points):** These caps are essential safety bounds. At the BUN <=12 tier with BUN 53 baseline, the uncapped 0.31 coefficient would project (53-10)*0.31 = 13.3 eGFR points of Phase 1 gain, which is unrealistic for a single mechanism. The 12-point cap is at the outer edge of what is clinically plausible for BUN-mediated functional recovery alone. I would recommend 10 as a more conservative cap, but 12 is not indefensible for a marketing illustration.

**Key concern:** The calc spec's 0.31 coefficient produces Phase 1 values approximately 3.4 points higher than the v2.0 formula for typical patients. For a patient-facing tool, the v2.0 formula (8% suppression + rate differential) is the more defensible approach because it decomposes the mechanism explicitly rather than relying on a single empirical coefficient from a pilot study.

### 2.4 Phase 2 -- Structural Tubular Recovery (Months 3-24)

**Verdict: CONCERN**

This is the most scientifically uncertain component of the model. The claim is that sustained BUN reduction permits "structural cellular rebuilding of tubular cells" producing +4 to +8 eGFR points over 21 months.

**What the evidence supports:**
- Tubular atrophy is a hallmark of CKD progression and is partially reversible in early-to-moderate CKD when the underlying insult is removed (e.g., relief of obstruction, treatment of interstitial nephritis).
- The p=0.002 from the pilot cohort suggests a statistically significant dose-response between BUN reduction and eGFR improvement. However, **a single p-value from a pilot cohort does not establish the magnitude of the effect**. The confidence intervals around the +8 point estimate are likely wide.
- The CRIC and MDRD cohorts do show that patients who achieve better metabolic control have slower CKD progression, but attributing +8 eGFR points of structural recovery specifically to BUN reduction is a strong claim.

**What the evidence does NOT support:**
- The magnitude of +8 eGFR points at BUN <=12 is at the high end of what any dietary or metabolic intervention has demonstrated in published prospective trials. For comparison, SGLT2 inhibitors (the strongest evidence-based renoprotective intervention) slow decline by approximately 1-2 mL/min/yr but do not typically produce sustained eGFR increases of this magnitude.
- The logarithmic accumulation curve is a reasonable shape for biological recovery processes, but there is no published validation of this specific functional form for tubular recovery.
- The term "structural cellular rebuilding" implies histological regeneration of tubular epithelium. While tubular repair does occur, the degree to which it translates to measurable GFR recovery in CKD Stage 3-5 is not well established.

**The asymmetry claim (BUN rises produce ~5x less eGFR impact than BUN falls):**
This is physiologically plausible but unvalidated. The argument would be that once tubular cells have recovered, they are more resilient to subsequent BUN-mediated stress. This is a hypothesis, not an established finding. Using it to justify slower post-Phase 2 decline is speculative.

**Phase 2 age attenuation (v2.0):** The v2.0 spec reduces Phase 2 gains by 20% for age >70 and an additional 35% for age >80. This is directionally correct -- tubular regenerative capacity declines with age. The magnitudes are reasonable estimates. This should be implemented even for the lean launch.

### 2.5 Post-Phase 2 Decline Rates

**Verdict: CONCERN**

| Tier | Post-Phase 2 Rate | Normal Aging | Assessment |
|------|-------------------|-------------|------------|
| BUN <=12 | -0.5 mL/min/yr | -0.8 to -1.0 mL/min/yr | **Optimistic.** This is slower than normal aging-related GFR decline in healthy adults (~-0.8/yr after age 40, per Rule 2010 and the Baltimore Longitudinal Study). Claiming CKD patients at BUN <=12 decline slower than healthy adults is not supported by any published data. |
| BUN 13-17 | -1.0 mL/min/yr | | Reasonable for well-managed Stage 3a CKD |
| BUN 18-24 | -1.5 mL/min/yr | | Reasonable |

**The critical issue:** -0.5 mL/min/yr for CKD patients implies near-complete halting of disease progression. While the cited "7-year follow-up data" may show this in a selected pilot cohort, survivorship bias and selection effects in pilot studies systematically overestimate treatment durability. A rate of -0.8 to -1.0 mL/min/yr for BUN <=12 would be more defensible and still shows a dramatic benefit over no treatment.

### 2.6 Dialysis Threshold

**Verdict: CAUTION**

**eGFR 12 vs 15:** In current clinical practice (KDIGO 2024, IDEAL trial), dialysis initiation is individualized but typically occurs between eGFR 5-10, with planning beginning at eGFR 15-20. The traditional teaching threshold was eGFR 15 (CKD Stage 5 definition). The IDEAL trial showed no benefit to "early" initiation at eGFR 10-14 versus "late" initiation at eGFR 5-7.

Using eGFR 12 as the "dialysis threshold" for a patient-facing tool is **neither correct as a clinical threshold nor as a statistical threshold**:
- If meant as "the eGFR at which dialysis becomes necessary," eGFR 8-10 would be more accurate for current practice.
- If meant as "the eGFR at which nephrology referral for dialysis planning is urgent," eGFR 15 is the standard (KDIGO).

**Recommendation:** For a marketing/educational tool, eGFR 12 is an acceptable middle-ground provided the label says "Estimated eGFR level requiring dialysis planning" rather than "dialysis threshold." The disclaimer must note that dialysis timing is individualized by the patient's nephrologist.

### 2.7 BUN Structural Floor Display (Amendment 3)

**Verdict: CONCERN**

This feature tells patients: "Your estimated structural capacity is eGFR [higher number]." This is the most clinically risky element of the entire application.

**Problems:**

1. **The BUN_ratio lookup table (0.67, 0.47, 0.32, 0.25) is not clinically validated.** These ratios are not published values -- they appear to be derived from the pilot cohort's dose-response curve. Presenting pilot-derived estimates as "your estimated structural capacity" to patients crosses from educational illustration into implied clinical assessment.

2. **Overestimation risk:** For a patient with BUN 40, eGFR 20 (Stage 4), the structural floor calculation is: `20 + (40-15) * 0.32 = 28.0`. Telling this patient their "structural capacity" is eGFR 28 could lead them to believe their kidneys are healthier than measured, potentially delaying important clinical decisions (dialysis planning, transplant evaluation, AV fistula creation). These preparations have 6-12 month lead times.

3. **Conflicting formulas:** The `bun_suppression_estimate` (Section 3.7) uses `(BUN-10)*0.31`, while the structural floor uses `(BUN-15)*ratio`. For BUN 35: suppression estimate = 7.8 pts; structural floor = (35-15)*0.32 = 6.4 pts. These different numbers for ostensibly the same concept (BUN-mediated eGFR suppression) will confuse both engineers and patients.

**Recommendation:** If this feature is retained, it must be labeled as "hypothetical" and accompanied by a strong disclaimer that it does not replace clinical assessment. Better: remove it entirely from the patient-facing display and reserve it for clinician-facing reports.

### 2.8 Test Vectors

**Vector 1 (BUN 35, eGFR 33, Age 58 -- Stage 3b):**

**Verdict: VALID with CAUTION**

- No-treatment trajectory: 33.0 to 11.2 over 10 years (-21.8 points, ~-2.2/yr). Consistent with Stage 3b natural history.
- BUN <=12 treatment: 33.0 peaking at 45.7 (month 24) then declining to 41.7 (year 10). The +12.7 peak gain is aggressive but not outside the realm of possibility for a patient with significant reversible BUN suppression. The 10-year outcome of 41.7 (+8.7 from baseline) is optimistic.
- The Phase 1 gain for BUN <=12: `(35-10)*0.31 = 7.75`, capped at 12 -> 7.75 points. This is clinically plausible for a 25 mg/dL BUN reduction.

**Vector 2 (BUN 53, eGFR 10, Age 65 -- Stage 5):**

**Verdict: CONCERN**

- Starting eGFR of 10 with BUN 53 represents severe CKD with marked uremic toxicity.
- BUN <=12 trajectory: eGFR 10 to peak 27.4 at month 24, then to 22.4 at year 10. This +17.4 point peak recovery is **the most clinically questionable projection in the model**.
- While the cited Patient 108 (BUN 53->9, eGFR 10->36) may be a real case, it is almost certainly an outlier. In Stage 5 CKD, significant irreversible nephron loss has occurred. The degree of reversibility depends heavily on the underlying etiology (diabetic nephropathy has very limited reversibility; acute-on-chronic kidney injury may have more).
- Projecting +17 points of recovery as a representative outcome for Stage 5 patients could give false hope and delay dialysis preparation. At eGFR 10, patients should already be in advanced CKD planning regardless of any projected recovery.

**Vector 3 (BUN 22, eGFR 48, Age 52 -- Stage 3a):**

**Verdict: VALID**

- Small Phase 1 gain (BUN delta only 12 points, giving 0.31-3.72 eGFR Phase 1 across tiers) is realistic.
- The BUN 18-24 path shows only 0.3 eGFR Phase 1 gain (BUN 22 to target 21 = 1 mg/dL delta), which is the correct behavior. The model correctly handles small BUN deltas.
- 10-year outcomes are plausible for early CKD with modest intervention.

### 2.9 Disclaimer Adequacy

**Verdict: CONCERN**

The current spec contains:
- A confidentiality notice (not patient-facing)
- Technical corrections for engineering
- No patient-facing disclaimer language

**This is a significant gap.** A patient-facing tool projecting kidney disease trajectories requires explicit, prominent disclaimers. See Section 5 below for specific recommendations.

### 2.10 Formula Discrepancy (0.31 Coefficient vs. v2.0)

**Verdict: The v2.0 formula is more physiologically sound.**

The calc spec's `PHASE1_COEFF = 0.31` is an empirical correlation coefficient that conflates multiple mechanisms:
- Reversible BUN-mediated tubular transport competition (the intended mechanism)
- The algebraic GFR-BUN clearance relationship (confounding)
- Residual confounding from correlated variables (hydration, protein intake, medications)

The v2.0 formula decomposes Phase 1 into two explicit components:
1. `phase1_suppression = eGFR * 0.08` -- the fraction of measured eGFR attributable to reversible BUN suppression
2. `phase1_real = (old_rate - new_rate) * 0.5` -- the benefit of slowing the decline rate for 6 months

This decomposition is more transparent, more physiologically interpretable, and less likely to overestimate treatment effects at extreme BUN values. **The v2.0 formula should be the governing implementation.**

The fact that the test vectors were generated with the calc spec's simplified model means they need to be regenerated with the v2.0 formulas. Do not calibrate the engine to match test vectors generated by a different formula.

---

## 3. Clinical Accuracy Score

**Overall: 5.5 / 10**

| Component | Score | Weight | Notes |
|-----------|-------|--------|-------|
| CKD-EPI 2021 equation | 7/10 | 10% | Correct equation, imperfect sex-free adaptation |
| No-treatment decline | 7/10 | 15% | Rates are literature-consistent; linear model is a known simplification |
| Phase 1 mechanism | 6/10 | 20% | Physiologically plausible direction; coefficient magnitude uncertain |
| Phase 2 structural recovery | 4/10 | 25% | Pilot data only; magnitudes at upper bound of plausibility |
| Post-Phase 2 decline | 4/10 | 15% | BUN <=12 rate slower than normal aging; not credible |
| Structural floor display | 3/10 | 10% | Unvalidated; high overestimation risk |
| Disclaimers | 2/10 | 5% | Essentially absent |

This score reflects a model that captures real physiological mechanisms directionally but assigns quantitative coefficients that systematically overestimate treatment benefits, particularly for severe CKD. For a **marketing/educational** tool (not a clinical decision support system), a score of 5-6 is workable provided the disclaimers are robust.

---

## 4. Recommendations for the Engineering Team

### P0 -- Must Fix Before Launch

1. **Implement the v2.0 Phase 1 formula** (`eGFR * 0.08` + rate differential), not the 0.31 coefficient. Regenerate test vectors accordingly. The current implementation uses the calc spec model.

2. **Add age input validation.** Reject age < 18 or age > 100. The CKD-EPI equation is not validated for children.

3. **Add eGFR input validation.** Reject eGFR < 3 (anuria, not meaningful for trajectory projection) or eGFR > 90 (not CKD, model not applicable).

4. **Revise the BUN <=12 post-Phase 2 decline rate** from -0.5 to -0.8 mL/min/yr. The current rate is slower than healthy aging, which is not credible.

5. **Implement Phase 2 age attenuation** from the v2.0 spec (0.80 for age >70, stacked 0.65 for age >80). Without this, elderly patients receive the same projected recovery as younger patients, which is physiologically incorrect.

6. **Write patient-facing disclaimers** (see Section 5). These must be displayed on every screen that shows trajectory data.

7. **Resolve the BUN suppression estimate vs. structural floor conflict.** Either unify these into a single formula or clearly document why two different numbers for the same concept are presented to the user.

### P1 -- Should Fix

8. **Cap the Phase 1 gain for Stage 5 patients.** The current model allows up to 12 eGFR points of Phase 1 gain even at eGFR 10. For patients with eGFR <15, Phase 1 gain should be attenuated (the v2.0 formula does this via the eGFR-dependent reduction factor, reducing it by 0.08 for eGFR <15).

9. **Add a confidence interval or range display** rather than single-line trajectories. Even a simple +/- band (e.g., +/- 30% of projected gain) would communicate the inherent uncertainty more honestly than deterministic lines.

10. **Consider non-linear decline modeling.** A simple improvement: use the decline rate at each time step based on the current eGFR (re-staging at each point) rather than fixing the rate based on baseline eGFR. This would naturally capture the acceleration of decline as eGFR falls through stage boundaries.

### P2 -- Desirable

11. **Add an option for sex-specific CKD-EPI** if sex is ever collected (e.g., in a future version). The current sex-free approximation loses 3-5 eGFR points of accuracy for female patients.

12. **Consider using the v2.0 continuous Phase 2 function** rather than discrete tiers. This produces smoother, more realistic projections and handles edge cases (BUN 12 vs 13) without discontinuities.

13. **Log model version in the API response** so that patients who return later can be told if their prior projections used a different model version.

---

## 5. Suggested Additions to Patient-Facing Disclaimers

The following disclaimers should be prominently displayed (not hidden in fine print) on every screen showing trajectory data:

### Required Disclaimer Block

> **IMPORTANT: This tool provides educational estimates only.**
>
> - These projections are based on population-level statistical models and may not reflect your individual kidney health trajectory.
> - The projected outcomes assume sustained dietary changes over months to years. Individual results vary significantly based on underlying kidney disease cause, adherence, comorbidities, medications, and other factors.
> - This tool does NOT replace evaluation by a nephrologist or healthcare provider. All treatment decisions should be made in consultation with your doctor.
> - The eGFR projections shown have not been validated in a prospective clinical trial and should not be used to make decisions about dialysis timing, transplant listing, or medication changes.
> - If your eGFR is below 20, you should be under the active care of a nephrologist regardless of any projections shown here.

### Required Disclaimer for Structural Floor Display (if retained)

> **About your estimated structural capacity:**
> This estimate is hypothetical. It represents a statistical model's estimate of how much your eGFR might improve if BUN-related suppression were fully reversed. Your actual kidney function is reflected in your reported eGFR. Do not use this estimate to delay recommended medical care, dialysis planning, or transplant evaluation.

### Required Disclaimer for BUN Suppression Estimate

> **About BUN suppression:**
> The estimated suppression shown is based on a statistical model, not a clinical measurement. The actual degree of reversible BUN suppression varies between individuals. This number should not be interpreted as a guaranteed recovery potential.

### Footer on All Projection Screens

> KidneyHood is an educational tool, not a medical device. It is not FDA-cleared or clinically validated for prognostic use. Always consult your nephrologist before making changes to your treatment plan.

---

*End of medical-scientific review.*
*Prepared for: Brad / Engineering Team, KidneyHood.org*
*This review is advisory and does not constitute medical practice or regulatory guidance.*
