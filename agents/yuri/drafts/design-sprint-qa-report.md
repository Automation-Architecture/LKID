# Design Sprint QA Report

**Reviewer:** Yuri (QA)
**Date:** 2026-03-25
**Sources of truth:** `lean-launch-mvp-prd.md`, `design-sprint-stories.md`, `design-sprint-meeting-1.md`

---

## Summary

**PASS WITH ISSUES** -- 5 cards reviewed, 3 PASS, 2 PASS WITH CONDITIONS. No hard blockers, but 7 issues found (3 medium, 4 low) that should be resolved before cards move to Done. All acceptance criteria are substantially met; the issues are spec-compliance gaps, not missing functionality.

| Card | Status | Issues |
|------|--------|--------|
| LKID-31 User Flows | PASS | 0 |
| LKID-32 Wireframes | PASS | 0 |
| LKID-33 Component Specs | PASS | 0 |
| LKID-34 Scaffold | PASS WITH CONDITIONS | 4 issues (1 medium, 3 low) |
| LKID-35 7 Screens | PASS WITH CONDITIONS | 3 issues (2 medium, 1 low) |

---

## LKID-31: User Flows

**Status:** PASS

**Findings:**

- [x] **Flows 2-5 and 8 removed:** Confirmed. Flows for Account Creation, Returning User Sign-In, Multi-Visit Re-Entry, Tier Upgrade, and Guest Data Expiry are all listed as removed with reasons in the "Flows Removed" table. Each is marked "Deferred to Phase 2" in a dedicated backlog section at the end of the document.
- [x] **Happy path matches spec:** Landing --> Email Entry --> Magic Link Sent --> Verify --> Prediction Form --> Loading --> Results. Exact match to Meeting 1 spec. All screen text, button labels, and route assignments are consistent.
- [x] **Error states documented:** All 6 error states present: invalid email (2a), expired link (2b), used/invalid link (2c), form validation (2d), server error (2e), PDF error (2f). Each has trigger, route, screen layout, and recovery behavior.
- [x] **Session model is 2-state:** ANONYMOUS --> VERIFIED. Confirmed with diagram and state detail table. No guest state, no account state, no expiry state. Matches PRD exactly.
- [x] **Route map has 4 routes:** `/`, `/auth`, `/predict`, `/results`. Confirmed in the Route Map table with correct screen assignments and auth requirements.
- [x] **Deferred flows noted:** Phase 2 Backlog section at bottom with 5 deferred flows, each with dependency and feature description.

**Issues:** None.

---

## LKID-32: Wireframes

**Status:** PASS

**Findings:**

- [x] **7 screens wireframed:** Landing, Email Entry, Magic Link Sent, Expired/Invalid Link, Prediction Form, Loading, Results. All present with full ASCII wireframes.
- [x] **3 breakpoints each:** Every screen has Mobile (<768px), Tablet (768-1024px), and Desktop (>1024px) wireframes with specific dimensions annotated.
- [x] **Landing spec:** Single CTA "Get Started", full-width button mobile, side-by-side hero+copy desktop, max-width 960px. Confirmed.
- [x] **Email Entry spec:** Max-width 400px centered card on all breakpoints. Mobile has no card wrapper (padding only). Tablet/desktop have card wrapper. Confirmed.
- [x] **Magic Link Sent spec:** Deep-link buttons (Gmail, Outlook) present, 60s resend countdown, max-width 400px. Confirmed on all 3 breakpoints.
- [x] **Expired Link spec:** Warning icon, "Send a new link" CTA, "Back to home" text link. Present on all breakpoints. Confirmed.
- [x] **Prediction Form spec:** Single column mobile, 2-column desktop (max 640px), email read-only with lock icon, 4 NumberInputs with units and normal-range helper text, 56px submit button. All confirmed with field specification table.
- [x] **Loading spec:** Skeleton chart (200px mobile, 340px desktop), skeleton PDF button, `aria-busy="true"` noted. Confirmed.
- [x] **Results spec:** Chart area (200px mobile, 280px tablet, 340px desktop), summary sentence above chart, PDF download button (full-width 56px mobile, auto-width desktop), footnote, disclaimer (sticky collapsed mobile, inline desktop). All confirmed.
- [x] **3 dead screens removed:** Document header states old-scope screens (Save Prompt, Sign-In, Guest Data Expired, Account, Dashboard, History, Settings) removed. Noted as deferred.
- [x] **8px grid and Inter font:** Design Foundation table confirms 8px base grid and Inter font. All spacing values are multiples of 4px or 8px. Font sizes annotated throughout.

**Issues:** None.

---

## LKID-33: Component Specs

**Status:** PASS

**Findings:**

- [x] **21 components in 5 groups:** Auth (3: MagicLinkForm, MagicLinkSent, VerifyHandler), Form (4: PredictionForm, NumberInput, NameInput, EmailInput), Chart (10: PredictionChart, TrajectoryLines, PhaseBands, DialysisThreshold, Tooltips, Crosshair, ChartAxes, EndOfLineLabels, AccessibleDataTable, LoadingSkeleton), Results (3: ChartContainer, PDFDownloadButton, DisclaimerBlock), Layout (1: AppShell with Header absorbed). Count confirmed: 3+4+10+3+1 = 21.
- [x] **Props interfaces present:** Every component has a TypeScript interface with typed props. Shared types (PredictionInput, PredictionResponse, TrajectoryData, DataPoint, PhaseDefinition, FieldError) defined at the top.
- [x] **Responsive behavior documented:** Every component has a "Responsive" section specifying behavior at mobile, tablet, and desktop breakpoints. Dimensions match wireframe specs.
- [x] **Accessibility requirements listed:** Every component has an "Accessibility" section. ARIA attributes specified (`aria-invalid`, `aria-required`, `aria-busy`, `aria-expanded`, `aria-describedby`, `aria-label`, `role` attributes). Touch targets annotated as 44px minimum. 16px font for inputs.
- [x] **Removed components noted as deferred:** "Deferred to Phase 2" section lists ~16 removed components with reasons: RadioGroup (SexRadioGroup), Toggle (SGLT2), Select (CKD diagnosis, proteinuria), FormSection, SubmitButton (absorbed), StatCard, StatCardGrid, ConfidenceBadge, UnlockPrompt, ChartFootnote (absorbed), SavePrompt, AuthBanner, SignInForm, PageLayout, Header (absorbed), Footer (absorbed), AccountDashboard, HistoryPage, FormErrorSummary (absorbed).
- [x] **New/updated components specified:** NameInput (2.3), PDFDownloadButton (4.2), MagicLinkSent with deep-link buttons (1.2), DisclaimerBlock with sticky mobile variant (4.3), EmailInput (2.4). All fully specified with props, states, layout, responsive, and accessibility.
- [x] **NumberInput spec:** `inputmode="numeric"` for integer fields (age), `inputmode="decimal"` for float fields (creatinine, potassium). Min/max/step specified per instance. Unit display and helper text with normal ranges documented. All 4 instances tabulated.
- [x] **44px touch targets and 16px font:** Annotated in NumberInput spec ("44px minimum touch target on all interactive elements"), PDFDownloadButton ("44px min touch target (56px exceeds this)"), and AppShell. Input font: "16px (prevents iOS zoom on focus)" in NumberInput.

**Issues:** None. Note: the component spec lists BUN range as 5-150 and creatinine as 0.3-15.0, while the PRD says BUN 1-150 and creatinine 0.1-30. The wireframes field table says BUN 5-150, creatinine 0.1-30. These are validation range discrepancies but fall under LKID-34/35 implementation, not the spec document itself. The spec is internally consistent with Meeting 1 decisions.

---

## LKID-34: Scaffold

**Status:** PASS WITH CONDITIONS

**Findings:**

- [x] **Next.js 15 with App Router:** `package.json` confirms `"next": "16.2.1"` (actually Next.js 16, which exceeds the requirement). App Router structure confirmed via `src/app/` directory layout.
- [x] **shadcn/ui installed:** `"shadcn": "^4.1.0"` in dependencies, plus `"radix-ui": "^1.4.3"`, `"class-variance-authority"`, `"clsx"`, `"tailwind-merge"`. shadcn components (Button, Input, Label, Card) are imported and used in pages.
- [x] **Tailwind CSS configured with design tokens:** `globals.css` contains full KidneyHood token set as CSS custom properties: `--primary: 158 70% 37%` (#1D9E75), `--secondary: 213 68% 54%` (#378ADD), `--destructive: 0 64% 51%` (#D32F2F), `--border`, `--card`, `--neutral`, `--primary-light`, `--secondary-light`. Comment references Inga's design-tokens.md.
- [x] **Inter font loaded:** `layout.tsx` imports `Inter` from `next/font/google` and applies as `--font-sans` variable. Applied to `<html>`.
- [x] **Breakpoints:** Tailwind default breakpoints are used (`md:` at 768px, `lg:` at 1024px), matching the spec's mobile <768px, tablet 768-1024px, desktop >1024px.
- [x] **Layout wrapper:** `max-w-[960px]` with `mx-auto` applied on landing page. Padding: `px-4` (16px mobile), `md:px-6` (24px tablet), `lg:px-8` (32px desktop). Matches spec.
- [x] **4 routes exist:** Confirmed via file system: `/` (page.tsx), `/auth` (auth/page.tsx), `/predict` (predict/page.tsx), `/results` (results/page.tsx).
- [x] **MSW installed:** `"msw": "^2.12.14"` in devDependencies. Handler file exists at `src/mocks/handlers.ts` with a POST `/predict` mock returning 4 trajectories.
- [x] **Header component:** Present in `src/components/header.tsx`. Logo as `<a href="/">` (via Next.js Link). Responsive height: `h-12` (48px mobile), `md:h-14` (56px tablet), `lg:h-16` (64px desktop).
- [x] **DisclaimerBlock:** Present in `src/components/disclaimer-block.tsx`. Mobile: sticky collapsed bar with expand/collapse. Desktop: inline full text with About/Privacy/Terms links.

**Issues:**

1. **[MEDIUM] Header missing `aria-label="KidneyHood home"` on logo link.** The spec (component-specs.md 5.1 AppShell, DESIGN-004 AC) requires `<a href="/" aria-label="KidneyHood home">`. The current implementation is `<Link href="/">KidneyHood</Link>` with no `aria-label`. Since the link has visible text content "KidneyHood" this is not a critical a11y failure, but the spec is explicit about the aria-label including "home". Add `aria-label="KidneyHood home"` to the Link element.

2. **[LOW] Inter font weight subset not specified.** DESIGN-004 AC says "Inter font loaded (400, 500, 600, 700 weights)". The `Inter` import in `layout.tsx` does not specify a `weight` parameter, which means all weights are loaded (larger bundle). Not blocking, but consider specifying `weight: ['400', '500', '600', '700']` for production optimization.

3. **[LOW] 8px spacing grid not explicitly enforced.** DESIGN-004 AC says "8px spacing grid enforced via Tailwind spacing scale". The current setup uses Tailwind's default 4px-based spacing (which includes 8px multiples). The spec implies a custom Tailwind config restricting spacing to 8px multiples only. Current implementation uses standard Tailwind spacing and achieves 8px-grid compliance in practice. Non-blocking.

4. **[LOW] DisclaimerBlock mobile: `aria-controls` references the content ID but the `id` is placed on the `<span>` inside the button rather than on a separate expandable region.** The `aria-controls` should point to the collapsible content container, not the text span. The current implementation has `aria-controls={contentId}` on the button but `id={contentId}` on the span within the button. The controlled content should be a separate element. Minor a11y structure issue.

---

## LKID-35: 7 Screens

**Status:** PASS WITH CONDITIONS

**Findings:**

- [x] **7 screens implemented:**
  - `/` Landing page with "Get Started" CTA linking to `/auth` -- Confirmed.
  - `/auth` Email entry view (default state) -- Confirmed. Form with email input, "Send me a sign-in link" button.
  - `/auth` Magic link sent view (swapped after submit, same route) -- Confirmed. View swaps via state. Deep-link buttons to Gmail/Outlook present with correct URLs.
  - `/auth` Expired/invalid link view (shown on `?error=expired`) -- Confirmed. Warning icon, "This link has expired", "Send a new link" button, "Back to home" link.
  - `/predict` Prediction form -- Confirmed. Email read-only with lock icon, Name, Age, BUN, Creatinine, Potassium fields. 2-column desktop layout.
  - `/results` Loading skeleton then results -- Confirmed. 2s loading delay, skeleton chart with responsive heights, then full results view.
  - `/results` Results view -- Confirmed via code (ResultsContent component): chart placeholder with labeled dimensions, summary sentence, PDF button, footnote, back-to-form link.

- [x] **Navigation works:** Landing --> Auth --> (skip to predict link) --> Predict --> Results. "Get Started" navigates to `/auth`. Email submit swaps to Magic Link Sent view. "skip to predict" dev shortcut advances to `/predict`. Form submit navigates to `/results` after 1.5s simulated delay. Logo links back to `/` from all pages.

- [x] **"Get Started" button navigates to `/auth`:** Confirmed. `<Link href="/auth">`.

- [x] **Email submit swaps to Magic Link Sent view:** Confirmed. `handleSendLink` sets view to "link-sent" on same `/auth` route.

- [x] **Deep-link buttons present:** "Open Gmail" links to `https://mail.google.com/mail/`, "Open Outlook" links to `https://outlook.live.com/mail/`. Both have `target="_blank"` and `rel="noopener noreferrer"`.

- [x] **Resend button with 60s countdown:** Confirmed. `useState(60)` with `setInterval` decrementing every second. Button disabled during countdown. `aria-disabled` and `aria-label` with countdown text present.

- [x] **Stubbed auth shortcut:** "skip to predict" link on email entry screen. Allows advancing to `/predict` without real auth.

- [x] **Back navigation:** Logo links to `/` on all pages. "Back to home" text link on expired view. "Back to form" link on results page.

- [x] **Responsive layout at all 3 breakpoints:** All pages use responsive classes: `md:hidden`/`hidden md:grid` for mobile/desktop layout switching. Correct breakpoints used throughout. Landing has stacked mobile, side-by-side tablet/desktop. Auth card is max-width 400px centered. Predict form is single-column mobile, 2-column desktop at 640px. Results chart placeholder has responsive heights (200/280/340px).

- [x] **Text content matches Meeting 1:** Headings ("Understand Your Kidney Health Trajectory", "Get Started", "Check your email!", "This link has expired", "Enter Your Lab Values", "Your Prediction"), body copy, button labels ("Send me a sign-in link", "See My Prediction", "Download Your Results (PDF)") -- all match.

- [x] **Design tokens used:** Primary color via `bg-primary`, `text-primary`. Muted foreground via `text-muted-foreground`. Border via `border-border`. Card background via `bg-[#F8F9FA]`. Destructive via `text-destructive`.

- [x] **44px touch targets:** Buttons use `h-12` (48px) or `h-14` (56px). Resend button has `min-h-[44px]`. "Back to home" link has `min-h-[44px]`. All meet 44px minimum.

- [x] **16px input font:** All inputs use `text-base` (16px). Confirmed in FieldBlock component (`className="h-12 text-base"`).

**Issues:**

1. **[MEDIUM] BUN field `inputmode` is `"decimal"` but spec says `"numeric"` for integer BUN and Age.** In `predict/page.tsx`, the BUN field has `inputMode: "decimal"` (line 69). The component spec (NumberInput instances table) specifies `inputmode="numeric"` for BUN since it is an integer field (step: 1). Additionally, the BUN `min` is 0 (line 73) but the spec says 5, and `max` is 200 but spec says 150. The creatinine `min` is 0 (line 86) but spec says 0.3, and `max` is 30 but step is 0.01 vs spec 0.1. The potassium `min` is 0 (line 99) but spec says 2.0, and `max` is 15 but spec says 8.0. These validation ranges do not match the component specs. While client-side validation is not yet implemented (that is DESIGN-006 scope), the field metadata should match specs for when validation is wired up.

2. **[MEDIUM] Auth page missing `DisclaimerBlock`.** The landing page (`/`), predict page (`/predict`), and results page (`/results`) all include `<DisclaimerBlock />`. However, the auth page (`/auth`) does not render a DisclaimerBlock. Per the wireframes (screens 2, 3, 4) and Meeting 1 spec, the auth screens do not show the disclaimer (they show a centered card with no footer). This is actually correct behavior per the wireframes -- the auth screens (Email Entry, Magic Link Sent, Expired Link) show only the centered card with no footer/disclaimer. So this is NOT an issue -- the implementation correctly omits the disclaimer on auth screens. *(Retracted upon review.)*

3. **[MEDIUM] PDF download button is permanently `disabled`.** In `results/page.tsx` line 67, the PDF button has `disabled` hardcoded with no loading/interaction state. Per DESIGN-005 AC, "PDF download button triggers 2s loading spinner then 'Download complete' toast (no actual PDF)". The button should be clickable with a simulated loading state. This is technically DESIGN-006 scope (stubbed API), but the button being permanently disabled prevents design review of the interaction. Should be clickable with a stub response.

4. **[LOW] Chart placeholder does not say "4 trajectories" in label.** Meeting 1 prototype plan says chart should be "gray placeholder box with labeled dimensions ('Chart: 4 trajectories, 340px x 960px')". The current placeholder says "eGFR Trajectory Chart" with responsive dimensions listed. Close enough for prototype purposes but does not exactly match the specified label format.

---

## Blocking Issues

No hard blockers. The following 3 medium-severity issues should be resolved before moving cards to Done:

1. **LKID-34: Header logo missing `aria-label="KidneyHood home"`** -- Quick fix, add the attribute.

2. **LKID-35: Field metadata (min/max/inputMode) does not match component specs** -- Update the `fields` array in `predict/page.tsx` to match the NumberInput instances table: BUN inputmode="numeric" (not decimal), BUN min=5 max=150, creatinine min=0.3 max=15.0 step=0.1, potassium min=2.0 max=8.0. Age inputmode="numeric" is already correct.

3. **LKID-35: PDF button permanently disabled** -- Make clickable with a stub 2s loading spinner, per DESIGN-005/006 acceptance criteria.

---

## Recommendations

Non-blocking suggestions for improvement:

1. **Specify Inter font weights** in `layout.tsx` (`weight: ['400', '500', '600', '700']`) to reduce bundle size. Currently loads all weights.

2. **Fix DisclaimerBlock `aria-controls` structure** so the controlled content is a separate element from the trigger text.

3. **Add `role="region"` and `aria-label="Medical disclaimer"` to DisclaimerBlock** as specified in component-specs.md 4.3. Currently missing the `role` attribute on the mobile wrapper.

4. **Chart placeholder label format** could be updated to match Meeting 1 exactly: "Chart: 4 trajectories, [width] x [height]".

5. **Consider adding `aria-label` to the form element** in the auth email entry view: `aria-label="Sign in with email"` as specified in MagicLinkForm component spec 1.1.

6. **MSW handler response shape** does not match the `PredictionResponse` interface from component-specs.md (missing `phases`, `dialysis_threshold`, `summary` fields; trajectory shape differs). This is acceptable for prototype but should be aligned before Sprint 1 integration.

---

*QA review complete. All 5 cards are substantially done. Resolve the 3 medium issues, then cards can move to Done.*
