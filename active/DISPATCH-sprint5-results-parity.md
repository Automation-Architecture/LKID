# DISPATCH — Sprint 5 Results Page Design Parity

**Target agent:** Harshit (Frontend)
**Supporting:** Inga (design review only)
**Jira card:** LKID-76 (to create — "Results page design parity + sitewide font regression")
**Branch:** `feat/LKID-76-results-parity`
**Target PR:** after LKID-71 merges to avoid conflicts on `app/results/[token]/page.tsx`

---

## Context

A UI design-vs-deployed audit (`agents/luca/drafts/ui-design-audit-sprint5.md`) found **8 P0 + 11 P1 + 7 P2 issues** on the deployed app, concentrated on the Results page. The audit also confirmed the visx chart itself **is rendering correctly** — that's not the problem. The problem is the rest of the Results page has drifted significantly from the finalized design in `project/Results.html`.

The finalized design lives at:

- `project/Results.html` — source of truth for this dispatch
- `project/Landing Page.html`, `project/Lab Form.html` — partial font/layout hints
- `project/design_handoff_kidneyhood_web_flow/screenshots/04-results.png` — reference screenshot

Evidence screenshots from the audit live at `agents/luca/drafts/ui-audit-screenshots/04-*.png`.

---

## Scope (P0 — must land this sprint)

### 1. Restore the shared layout on `/results/[token]`

- Navy `#1F2577` nav bar (64px tall, white centered "KidneyHood.org" brand in Manrope 700)
- Site footer with navy brand, nav links, and copyright line
- The Results page appears to be missing the global layout wrapper — diagnose whether it's a layout.tsx routing issue or a component-level omission, and fix accordingly

### 2. Sitewide font regression

- Load **Nunito Sans** (weights 400/500/600/700) for body text across every page
- Load **Manrope** (weights 400/500/600/700/800) for display/H1 across every page
- Currently: Inter is rendering everywhere for body; Manrope loads on Landing H1 but NOT on Results H1
- Verify with `getComputedStyle(document.body).fontFamily` after fix

### 3. Rebuild the Results page sections per `project/Results.html`

- **Page header:** "Kidney Health Overview" title (Manrope 700, clamp(28px, 3.6vw, 44px)) + prominent navy Download pill with white circular PDF-icon badge (top-right, aligned with title)
- **"Scenario Overview" heading** (navy with bullet dot, Manrope 700, 15px)
- **4-pill color row** above the scenario cards: "BUN ≤ 12" (green), "BUN 13-17" (navy), "BUN 18-24" (yellow), "No Treatment" (gray). Use the CSS variables from `project/Results.html` lines 22–35 as the palette reference.
- **Scenario cards with tinted backgrounds** — not plain white. Each card: tinted bg + matching border + 32px Manrope-800 colored numeric values + "5 yr eGFR" / "10yr eGFR" dual-column + footer line "Dialysis: …"
- **"What Your Results Mean" block** with the blue radial kidney visual (left) and explanation card (right). Copy is dynamic based on engine output; use the design's template.
- **Second Download pill** inside the explanation block
- **Edit CTA as a full navy pill** at the bottom ("← Edit your information"), NOT a text link
- **Fine-print disclaimer** under the explanation block

### 4. Chart palette — Inga's decision (RESOLVED)

Full memo: `agents/inga/drafts/chart-palette-decision.md`.

**Verdict: hybrid — Palette A+ on chart lines, Palette B on pills/cards/icons.**

- **Chart lines:** keep current WCAG-compliant palette with ONE swap — Stable line `#0369A1` → `#1F2577` (brand navy). One-line edit at `app/src/components/chart/transform.ts:32`.
- **Scenario pills, scenario cards, legend heart icons:** use `--s-green / --s-blue / --s-yellow / --s-gray` and their `*-bg` / `*-border` variants from `project/Results.html:24–35`.
- **Rationale:** Palette B yellow `#D4A017` = 2.38:1 contrast vs white — fails even the 3:1 graphical-object bar. Desaturating it to compliance lands back at amber-700 (which is Palette A). Large filled surfaces (pills, cards, 20px+ icons) are not bound by the 2px-stroke-on-white constraint, so Palette B is safe there.
- **Migration note:** update `project/Results.html` to document chart-line hex codes separately from `--s-*` pill tokens so the design source stops drifting. Light axe-core re-run only (new chart color is strictly higher contrast than the one it replaces).

### 5. Scenario-cards "Dialysis: Not projected" verification (consult John)

Audit noted all 4 scenario cards showed "Dialysis: Not projected" for the test input (eGFR 38 baseline). Could be correct engine output or a display bug. John confirms whether this matches engine logic for that input; if it's a display bug, John + Harshit fix before this PR merges.

---

## Out of scope (separate dispatches)

- **Email Gate** parity (blurred Results-preview backdrop + padlock + copy fixes) — separate card
- **PDF** parity (navy header, patient name/date, scenario pills, kidney visual) — separate card
- **Transactional email template** parity — separate card
- **Lab Form** missing kidney watermarks — P1, separate minor card
- **Landing page** nav-items cleanup — P2, skip unless trivial

---

## Acceptance criteria

- [ ] `/results/[token]` renders with navy nav + footer matching Landing page
- [ ] `getComputedStyle(document.body).fontFamily` includes "Nunito Sans" on every page (verified by a Playwright test)
- [ ] `getComputedStyle(h1).fontFamily` includes "Manrope" on Landing + Results
- [ ] All sections listed in Scope §3 are present and match `project/Results.html` visually (Inga pixel-check acceptable ±2px)
- [ ] Chart palette decision made + documented in PR description
- [ ] Scenario-card "Dialysis: …" values are engine-correct (John signs off)
- [ ] Axe-core audit passes (no regressions vs current main)
- [ ] Existing Playwright E2E tests still pass
- [ ] Yuri QA verdict = PASS before merge
- [ ] Copilot + CodeRabbit reviews addressed

---

## Non-goals

- No new engine logic
- No new copy (use design copy verbatim unless Inga revises)
- No animation work
- No chart structural changes (chart is working; just palette TBD)

---

## Dependencies / sequencing

- Waits on LKID-71 (PostHog) merging first if `app/results/[token]/page.tsx` is touched in that branch
- Requires Inga decision on chart palette before final PR
- Does not block LKID-73 (SEO) or LKID-74 (CSP)

---

## Reference artifacts

- Audit report: `agents/luca/drafts/ui-design-audit-sprint5.md`
- Audit screenshots: `agents/luca/drafts/ui-audit-screenshots/`
- Design source: `project/Results.html` (600 LOC, fully self-contained)
- Design tokens: `project/Results.html` lines 11–39 (CSS variables)
