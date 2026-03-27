**Subject:** Your KidneyHood dashboard is live

Hi Lee,

Wanted to give you a proper update. First — thank you for the calc spec. The Python pseudocode gave us exactly what we needed to start building. Your corrections were sharp and saved us from shipping bad math, so genuinely appreciated.

**Your dashboard**

You now have a live client dashboard that will be your window into the build:

[https://kidneyhood.vercel.app/client/lee-a3f8b2](https://kidneyhood.vercel.app/client/lee-a3f8b2)

Here you'll find weekly progress updates, sprint-by-sprint status, spec tracking (so you can verify we're building to your requirements), and direct access to the prototype. It updates every week as work lands.

**The prototype**

We finished our first sprint this week — all 8 cards complete, 7 screens built and QA-passed. You can click through the full flow here:

[https://kidneyhood.vercel.app](https://kidneyhood.vercel.app)

This is the patient-facing experience: landing, lab entry form, eGFR trajectory chart, PDF download, and the supporting screens around it. Everything is navigable end-to-end.

**Your spec corrections — confirmed**

Three items from your feedback are tracked and locked in:

- eGFR threshold corrected to 12 (was wrong in our initial pass)
- Potassium removed from the input set
- BUN suppression estimate tracked as a factor

You'll see these reflected in the spec tracker on your dashboard. Nothing slipped through.

**What's next**

Sprint 2 kicks off April 6. This is where your algorithm comes to life — the rules engine gets implemented, the chart renders real projections, and we wire up auth and the database. Your calc spec is the blueprint for all of it.

**A few technical questions**

As we gear up for Sprint 2 and the rules engine implementation, we had a clinical data scientist review the calc spec alongside the v2.0 formulas to make sure we build this right. A handful of questions came up that we'd love your input on — you know this model better than anyone.

1. **Phase 1 formula** — The calc spec uses `PHASE1_COEFF = 0.31` (the Spearman-derived coefficient), but the v2.0 spec in Section 9.5 uses `eGFR * 0.08 + rate differential` where `phase1_real = (rate_P1 - newRate) * 0.5`. Two sub-questions: (a) Which model should we validate the test vectors against? (b) For our simplified lean launch (no 5-pillar model), is it correct to use the CKD-stage base decline rate as `rate_P1`?

2. **Stage 5 recovery range** — Test Vector 2 (eGFR 10, BUN 53) projects recovery to eGFR 27.4 at BUN ≤12. Our reviewer noted that's a +17.4 point gain, which is at the outer edge of plausibility for Stage 5 patients. Is this projection something the pilot cohort supports as a representative outcome, or more of an outlier scenario like Patient 108?

3. **Post-Phase 2 decline at BUN ≤12** — The spec has this at -0.5 mL/min/yr, but published data on normal aging-related GFR decline in healthy adults runs around -0.8/yr (Rule 2010, Baltimore Longitudinal Study). We want to make sure we're on solid ground — does the 7-year follow-up data support -0.5, or would something closer to -0.8 be more appropriate?

4. **BUN Structural Floor display** — Amendment 3 introduces the BUN_ratio lookup table (0.67, 0.47, 0.32, 0.25). Is this table validated against the cohort data directly, or derived from the regression slope? We want to understand its provenance so we label it correctly for patients.

5. **Phase 2 age attenuation** — The v2.0 spec applies age-based reduction factors (0.80 for >70, 0.65 for >80) to the structural recovery projection. Should we include this in the lean launch engine, or is it something you'd prefer to defer until after MVP?

No rush on any of these — even a quick reply pointing us in the right direction would be great. We'd rather ask now than discover a discrepancy after the engine is built.

**One ask**

Take a few minutes to explore the dashboard and click through the prototype when you get a chance. If anything looks off or raises questions, just reply here. The dashboard will keep updating weekly, so you'll always have a current view of where things stand.

Talk soon,
Brad
