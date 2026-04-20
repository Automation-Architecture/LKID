# UI Design Audit — Sprint 5 (deployed vs project/ designs)

**Audit date:** 2026-04-20
**Auditor:** subagent (general-purpose + agent-browser)
**Scope:** Landing, Lab Form, Email Gate, Results, PDF, Email Template
**Live app:** https://kidneyhood-automation-architecture.vercel.app
**Token used for Gate/Results:** `ENQyeapKsvTHaSjQurU-qVb_XSdP-l0ZmRDBSB7Grvg`
**Test inputs:** BUN 35 / Creatinine 1.8 / Potassium 4.5 / Age 55

## Summary

- **Overall verdict:** DIVERGED on Results + PDF + Email; PARTIAL on Gate; MATCH on Landing + Lab Form (with minor drift)
- **P0 issues (must fix):** 8
- **P1 issues (should fix):** 11
- **P2 issues (nice to fix):** 7

**Important correction to Brad's premise:** The Results page chart is NOT missing. It renders a 4-path SVG (958×280, `data-testid="egfr-chart-svg"`) with axis, threshold, and tier labels. This was confirmed by viewport screenshot (`04b-results-chart-viewport.png`) and by direct DOM inspection. A full-page screenshot (`04-results-full.png`) captured blank where the chart should be — this appears to be an agent-browser/headless rendering artifact for visx, not a production defect. The real problems with the Results page are styling, palette, layout, and missing sections — not an absent chart.

**Global regression:** The deployed site uses **Inter** for body text and H1 on the Results page, where the design spec calls for **Nunito Sans** (body) and **Manrope** (display). Manrope loads correctly on Landing H1; it does NOT load on Results H1. Nunito Sans is missing sitewide.

---

## Per-screen findings

### Landing (`/` vs `Landing Page.html`)

**Evidence:** `ui-audit-screenshots/01-landing-full.png`, `01b-landing-hero.png`

**Verdict: MATCH (with minor drift)**

- **P2** — Nav has extra nav items (How it works / Preview / About / Contact) around a centered brand — design shows the brand centered alone. Extra links are functionally reasonable, not a real divergence.
- **P2** — Hero section includes "couple photo" placeholder box and two stat cards — all present and laid out as designed.
- **P2** — Trajectory chart in hero is a simple downward line with 6 gradient dots, matching design spec.
- **P2** — "How it works" section, navy band, "See your future" section, final CTA with green kidney art, and footer are all present and recognizable vs. design.
- **P1** — Body font is **Inter**, design calls for Nunito Sans. Display H1 font **is** Manrope on this page (correct).

### Lab Form (`/labs` vs `Lab Form.html`)

**Evidence:** `ui-audit-screenshots/02-labs-full.png`

**Verdict: MATCH (with two minor bugs worth logging)**

- Correct fields: BUN, Creatinine, Potassium, Age; required marking; "Add more details (optional)" toggle + blue "Add +" button.
- Submit pill "See my results" matches the navy with white-ring halo.
- **P2 (design bug)** — Deployed shows `mEq/L` suffix for Potassium; design shows `mg/dL`. Deployed is **medically correct** — mg/dL is a bug in the design HTML, not the app. No fix needed on app side; flag to Inga.
- **P2** — Deployed shows Normal range hints with em-dash `7–20`; design uses hyphen `7-20`. Trivial.
- **P1** — Missing the pair of kidney-silhouette watermarks flanking the form card. Design has soft mint-green kidney SVGs on left/right; deployed is plain gray background.
- **P1** — Body font is Inter, not Nunito Sans.

### Email Gate (`/gate/[token]` vs `Email Gate.html`)

**Evidence:** `ui-audit-screenshots/03-gate-full.png`

**Verdict: PARTIAL**

- **P0** — Missing the **blurred "Results preview" backdrop** behind the modal. Design shows dimmed "Kidney Health Overview" heading, chart box, "Download Your Results" pill, scenario list, and scenario tabs as a teaser. Deployed shows a plain blue/gray blur overlay with no content — this is a core part of the gate's persuasive design (giving a preview of what's behind the email wall).
- **P1** — Heading is wrong. Design: "Almost there — your results are ready!" (navy Manrope). Deployed: "SEE YOUR FULL RESULTS" (uppercase, different wording).
- **P1** — Subcopy is wrong. Design: "We've prepared your kidney health report based on the information you entered. Enter your email to view your results and receive a copy for later." Deployed: "Enter your name and email to view your kidney health trajectory. We'll also send a copy of your report to your inbox."
- **P1** — Missing the **padlock icon** (circular gray badge with lock SVG) above the heading — key visual cue for "you're behind a gate."
- **P2** — Deployed shows visible "Name" and "Email" labels above inputs; design uses placeholder-only inputs.
- **P2** — Input placeholders differ. Design: "Enter Your Full Name" / "Enter Your Email". Deployed: "Your name" / "you@example.com".
- **P2** — Submit button text. Design: "View my report". Deployed: "View my results".
- **P2** — Reassurance copy. Design: "We'll never spam you or share your email. Your information is secure and will not be shared." Deployed: "Your information stays private. We'll only email you about your report."

### Results (`/results/[token]` vs `Results.html`) — CHART FOCUS

**Evidence:** `ui-audit-screenshots/04-results-full.png`, `04b-results-chart-viewport.png`, `04c-results-full-v2.png`, `04d-results-scenarios.png`, `04e-results-bottom.png`

**Verdict: DIVERGED (multiple P0 issues)**

**Chart status (correcting Brad's flag):** Chart **is present** and rendering with 4 trajectory lines, y-axis (0/15/30/45/60/75/90), x-axis (0 → 10yr), red dashed dialysis threshold, tier band labels on right, and end-point value labels (42/30/28/14). Brad's concern that the chart is "MISSING from the live app" is incorrect — the visx chart renders correctly; a full-page screenshot tool rendered it blank due to lazy-render, but the viewport screenshot and DOM inspection both confirm the chart is live.

**What is actually wrong:**

- **P0** — **Nav bar is broken.** Design: solid navy `#1F2577` bar, 64px tall, white centered "KidneyHood.org" brand, Manrope 700. Deployed: transparent/white background, black text left-aligned "KidneyHood" (no .org). `getComputedStyle(nav).backgroundColor === "rgba(0, 0, 0, 0)"`. Looks like the Results page is not wrapped in the shared layout that supplies the nav — or a different nav component that isn't styled.
- **P0** — **Page title text is wrong.** Design: "Kidney Health Overview" (Manrope 700, 44px). Deployed: "Your Prediction" (Inter, smaller).
- **P0** — **No top "Download Your Results" pill button.** Design has a prominent navy pill with a white circular PDF icon badge in the top-right of the page header, aligned with the title. Deployed's only download affordance is a plain text-with-icon link much lower on the page.
- **P0** — **Missing "Scenario Overview" section heading.** Design has a navy-bulleted section title before the pill row.
- **P0** — **Missing the scenario pill row.** Design shows 4 full-width colored pills ("BUN ≤ 12" green, "BUN 13-17" navy, "BUN 18-24" yellow, "No Treatment" gray) ABOVE the scenario cards. Deployed collapses the pill into a small colored dot + text at the top of each card.
- **P0** — **Scenario cards are visually wrong.** Design: tinted backgrounds (green-bg, blue-bg/navy-tinted, yellow-bg, gray-bg) with large 32px Manrope-800 colored numerics. Deployed: plain white cards with a colored dot next to the name, bold numerics in default text color. The tinted "family" color-coding is lost.
- **P0** — **Missing "What Your Results Mean" explanation block with the blue kidney visual.** Design has a 320×320 circular blue-gradient kidney-pair SVG (radial gradient from `#9ED6F5` to `#1E5C8A`) on the LEFT of the explanation card, with concentric circle decorations. Deployed shows just the explanation text in a mint-colored tinted bar — no kidney visual, no section title "What Your Results Mean".
- **P0** — **Missing second download pill in the explanation block.** Design has a second "Download Your Results" navy pill centered in the explanation card. Deployed has only one download affordance total.
- **P0** — **Edit CTA styled wrong.** Design: prominent navy pill "← Edit your information" with white-ring halo. Deployed: tiny underlined text link "← Edit info".
- **P0** — **Missing footer.** Design has "KidneyHood.org" brand + Privacy / Disclaimer / Contact nav. Deployed shows only the short disclaimer sentence at the very bottom, no brand, no nav.
- **P1** — **Chart palette is wrong.** Deployed: `#047857` (dark green), `#0369A1` (blue), `#B45309` (amber), `#374151` (dark gray). Design: `#3FA35B` (green), `#1F2577` (navy), `#D4A017` (yellow), `#6B6E78` (gray). The deployed palette was likely adjusted for WCAG AA in LKID-67 — confirm with Harshit/Inga whether the new palette is intentional or should revert.
- **P1** — **Chart labels overlap.** "Dialysis threshold" red label collides with the gray end-point value "14" at x=10yr. See `04b-results-chart-viewport.png`. Also the "Tier 1" pill and "Normal/Mild" label are crowded in the top-right.
- **P1** — **Chart has extra tier-band labels on right** ("Tier 1", "Moderate", "Severe", "Dialysis Zone"). Design has no tier bands — only a single dashed threshold line labeled "Level where dialysis may be needed".
- **P1** — **Chart x-axis starts at "0"**, design starts at "1 yr" (no zero tick in the design).
- **P1** — **Chart missing the end-point circle callouts.** Design shows two white-filled circles on the right edge with the values "17" (green stroke) and "4" (gray stroke) for the best/worst trajectory end-points. Deployed shows just text numbers floating near the lines.
- **P1** — **Typography regression.** Results page H1 is rendered with Inter, not Manrope. Body text uses Inter, not Nunito Sans. Confirmed via `getComputedStyle`.
- **P2** — Scenario card says "Dialysis: Not projected" for ALL 4 scenarios. The design shows "Not projected" only for the green (BUN ≤ 12) case; the other 3 show age-based projections (e.g., "~age 62 yr"). This may be a legitimate engine output for Brad's specific inputs (baseline eGFR 38 is relatively high, so the 10-year end-points of 42/30/28/14 may all sit above the dialysis threshold). Verify with John that the engine is correctly computing dialysis projections for non-green scenarios; if engine output is correct, this is not a bug.
- **P2** — Explanation text in deployed has a light-mint tinted background pill — design has plain white card with a section title.

### PDF (download vs `PDF Report.html`)

**Evidence:** `ui-audit-screenshots/report.pdf` (download from `GET /reports/{token}/pdf`)

**Verdict: DIVERGED**

- **P0** — **Missing the navy header bar.** Design has a solid navy `#1F2577` band with centered "KidneyHood.org" at the top of the page. Deployed PDF has a plain white top with green/teal "KidneyHood" left-aligned text (looks like a placeholder H1).
- **P0** — **Missing patient name and report date block.** Design has a "meta" row under the header: "Kidney Health Overview" + person name (e.g. "John Smith") on the left, and "Report Date: April 24, 2026" right-aligned. Deployed PDF has neither the overview title, the name, nor the date — just a plain "Your eGFR Prediction" subtitle.
- **P0** — **Missing scenario pill row.** Design has the 4 colored pills (BUN ≤ 12 / BUN 13-17 / BUN 18-24 / No Treatment) directly above the scenario cards in the PDF. Deployed PDF omits the pills entirely.
- **P0** — **Missing blue kidney visual + "What Your Results Mean" block.** Design has a compact 130px circular blue-gradient kidney SVG on the left of the explanation block, with the section title. Deployed PDF has just the explanation text with no visual and no section heading.
- **P0** — **Missing "KidneyHood.org" brand footer.** Design ends with a navy brand signature at the bottom center. Deployed PDF has only the disclaimer line.
- **P1** — Scenario cards render as 2×2 grid in deployed PDF; design has single 4-column row.
- **P1** — Chart in PDF inherits the same tier-label overlap issue as the web version (Dialysis threshold text collides with the end-point "14"). Design uses a simpler 25/20/15/0 y-axis and a single dashed threshold.
- **P1** — Chart palette in PDF matches the web deployment (darkened green/blue/amber/gray), not the design palette. Same question as web: intentional for a11y?
- **P2** — Deployed PDF has an extra paragraph under the disclaimer: "Results are based on population-level models and may not reflect your individual clinical trajectory." — acceptable added medical disclaimer.

### Email Template (`backend/templates/report_email.html` vs `project/Email Template.html`)

**Evidence:** `ui-audit-screenshots/05-email-deployed.png`, `05-email-design.png`. Source reviewed at `/Users/brad/Documents/aaa/Client Projects/KidneyHood/repo/LKID/backend/templates/report_email.html`.

**Verdict: DIVERGED**

- **P0** — **Missing the hero image / blue kidney visual ring.** This is the dominant visual element of the design email — a 260px-tall radial-gradient sky-blue panel with a centered ringed kidney SVG (the same blue kidney visual used on the Results page). Deployed email has no hero at all, just navy header → text.
- **P0** — **Missing the "View my report" CTA button.** Design centers a navy pill button (full CTA in body), which is the single most important click target. Deployed email has no button of any kind — it just tells the reader the PDF is attached, with no link back to the app.
- **P1** — Body copy is very different:
  - Design body: "Hi John, / Your kidney health report is ready. / You can view and download your results using the link below: / [View my report] / We've also attached a PDF version of your report for your convenience / This report is based on the information you provided..."
  - Deployed body: "Hi {{ name }}, / Thanks for using KidneyHood. Based on the lab values you provided, your estimated current eGFR is {{ egfr_baseline }} mL/min/1.73m². / Your full personalized report is attached to this email as a PDF. / ..."
  - The design email invites the reader back to the app (web-first). The deployed email is PDF-first with no app link.
- **P1** — **Footer mismatch.** Design has minimal footer: "KidneyHood.org" brand + Privacy / Disclaimer / Contact row. Deployed has more text: "Questions? Just reply to this email..." + compliance/unsubscribe line + "For informational purposes only...". Deployed footer is more transactional-compliance-friendly but loses the brand nav.
- **P1** — **Disclaimer styling differs.** Deployed has a green-bordered light-gray callout box with a clinical-warning disclaimer; design has no such block. Deployed is richer/safer; design is cleaner. Decide which to keep.
- **P2** — Deployed uses Helvetica Neue / Arial fallback stack; design uses Manrope/Nunito Sans. Email clients strip custom webfonts anyway, so this is fine for email — just flag that the visual in design does NOT render in real inboxes (the Manrope H1 won't load in Gmail/Outlook desktop).

---

## Recommendations

Ordered by impact. Owners are suggestions; assignments go through Husser.

### P0 — Must fix before launch (content parity + core visuals)

1. **Results page: restore the shared navy nav bar + footer** — the page is currently missing the global nav and footer components. Check that `/results/[token]` is inside the correct root layout. Without this, the results page looks stripped/broken compared to every other screen. **Owner: Harshit.**
2. **Results page: rename title to "Kidney Health Overview"** (Manrope 700). Currently shows "Your Prediction". **Owner: Harshit.**
3. **Results page: add the top "Download Your Results" pill button** with white-ring halo and white circular PDF icon badge, right-aligned in the page header. **Owner: Harshit + Inga for the pill+icon styling.**
4. **Results page: add "Scenario Overview" section heading and the 4-pill row** above the scenario cards (BUN ≤ 12 green, BUN 13-17 navy, BUN 18-24 yellow, No Treatment gray). **Owner: Harshit.**
5. **Results page: restyle scenario cards with tinted backgrounds** (green-bg, navy-bg, yellow-bg, gray-bg), large 32px Manrope-800 colored numerics, and the dividing border above "Dialysis: …". **Owner: Harshit + Inga.**
6. **Results page: add the "What Your Results Mean" explanation block with the blue kidney visual + second Download pill.** The circular blue-gradient kidney SVG is shared with the email template hero — one component, two uses. **Owner: Harshit + Inga for the SVG extraction.**
7. **Results page: restyle "← Edit your information"** as a full navy pill, not a tiny text link. **Owner: Harshit.**
8. **Email Gate: add the blurred Results preview behind the modal + padlock icon + correct copy.** Design is specific: dimmed "Kidney Health Overview" title + Download pill + chart + scenarios tabs visible behind a dimmed scrim. Currently just a gray blur. Update heading, subcopy, button text, and reassurance text per design. **Owner: Harshit.**
9. **PDF: restore the navy header bar, patient name + report date block, scenario pill row, blue kidney visual, and KidneyHood.org footer.** The PDF template is Playwright-rendered from an HTML template — likely `backend/templates/pdf_*.html` or similar. Align it with `project/PDF Report.html`. **Owner: John + Inga.**
10. **Email template: add the blue-kidney hero image and the "View my report" CTA button with a link back to `/results/[token]`.** Re-examine the body copy vs design — the deployed version is PDF-attachment-focused; the design is view-in-app-focused. **Owner: John (sends the email) + Inga (template styling).**

### P1 — Should fix before launch (polish + palette)

11. **Sitewide: load Nunito Sans** and ensure Manrope is applied to all display headings (currently Results H1 falls back to Inter). Likely a Next.js/Tailwind font-import issue in the root layout. **Owner: Harshit.**
12. **Results + PDF chart: decide on palette** — design `#3FA35B / #1F2577 / #D4A017 / #6B6E78` vs. deployed `#047857 / #0369A1 / #B45309 / #374151`. If the deployed palette is from LKID-67 (WCAG AA contrast work by Harshit + Inga), document it and update the design spec. Otherwise revert. **Owner: Inga + Harshit.**
13. **Results chart: fix overlapping labels** — "Dialysis threshold" text collides with end-point "14". Consider moving the threshold label to a fixed position or left-aligning. **Owner: Harshit.**
14. **Results chart: remove the tier bands / tier labels on the right** ("Tier 1", "Moderate", "Severe", "Dialysis Zone") — design does not include these. If Lee wants them, update the design spec. **Owner: Inga (decide) → Harshit (implement).**
15. **Results chart: start x-axis at "1 yr", not "0"** to match design. **Owner: Harshit.**
16. **Results chart: add end-point circle callouts** (white-filled circles on the right edge with the value written inside — "17" in green stroke, "4" in gray stroke). **Owner: Harshit.**
17. **Lab Form: add the flanking kidney-silhouette watermarks** (soft mint SVGs on left/right of the form card). **Owner: Harshit + Inga.**
18. **Email Gate: update heading ("Almost there…"), subcopy, button text ("View my report"), and reassurance copy** per design. **Owner: Harshit + Inga for copy.**
19. **PDF: change scenario card layout** from 2×2 to 4-column row to match design. **Owner: John + Inga.**
20. **PDF + Results chart: apply the palette/label decisions from (12)–(16) consistently.** **Owner: Inga + Harshit + John.**
21. **Email template: reconsider the green-bordered disclaimer callout** — keep for compliance safety OR drop for design cleanliness. Ask Inga for the call. **Owner: Inga + John.**

### P2 — Nice to fix (minor)

22. **Results card values**: confirm with John that "Dialysis: Not projected" for all 4 scenarios is the correct engine output for inputs `BUN=35, Creatinine=1.8, Potassium=4.5, Age=55` — not a display bug where the age is being hidden. **Owner: John to confirm.**
23. **Lab Form Potassium suffix**: deployed shows `mEq/L` (medically correct); design shows `mg/dL` (wrong). Update the design spec in `project/Lab Form.html`; no app change. **Owner: Inga to update design.**
24. **Landing nav**: deployed has extra links (How it works / Preview / About / Contact). Design has just the centered brand. Decide whether extra nav is desired or should be removed for design parity. **Owner: Inga.**
25. **Email Gate**: decide whether to keep visible Name/Email labels (accessibility pro) or switch to placeholder-only per design (cleaner). **Owner: Inga + Yuri for a11y input.**
26. **Landing body font**: falls back to Inter — consider fixing at the same time as the sitewide font fix (item 11).
27. **Lab Form hints**: deployed uses em-dashes `7–20`; design uses hyphens `7-20`. Trivial.
28. **Email template footer**: align Privacy/Disclaimer/Contact nav links with what the other screens show.

---

## Appendix: Evidence artifacts

All screenshots saved to `/Users/brad/Documents/aaa/Client Projects/KidneyHood/repo/LKID/agents/luca/drafts/ui-audit-screenshots/`:

- `01-landing-full.png` — Full-page landing
- `01b-landing-hero.png` — Landing hero viewport (nav + H1 + CTA)
- `02-labs-full.png` — Full-page lab form
- `03-gate-full.png` — Email gate modal
- `04-results-full.png` — Full-page results (chart renders blank — tooling artifact, see `04b`)
- `04b-results-chart-viewport.png` — Chart area viewport screenshot (confirms chart is live)
- `04c-results-full-v2.png` — Second attempt at full-page results
- `04d-results-scenarios.png` — Scenario cards + chart lower portion
- `04e-results-bottom.png` — Download link, Edit info, disclaimer at bottom
- `05-email-deployed.png` — Deployed email template rendered from `backend/templates/report_email.html`
- `05-email-design.png` — Design email template rendered from `project/Email Template.html`
- `report.pdf` — The actual PDF downloaded from `/reports/{token}/pdf` on the Railway backend

Key source files cross-referenced:
- Results design: `project/Results.html`
- PDF design: `project/PDF Report.html`
- Email design: `project/Email Template.html`
- Deployed email: `backend/templates/report_email.html`
