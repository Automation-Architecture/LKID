# KidneyHood Design Sprint — User Stories

**Author:** Husser (Product Manager)
**Date:** 2026-03-25
**Source:** Design Sprint Meeting 1 output + Lean Launch MVP PRD v2
**Status:** Draft — Pending CTO review
**Total Stories:** 8 across 1 epic, 1 sprint (pre-Sprint 1)

---

## Epic: Design Sprint

**Goal:** Deliver revised UX artifacts and a code-based hi-fi prototype that the backend team can reference when building Sprint 1. No backend work starts until Inga signs off on the prototype.

**Timeline:** 5 working days (per Meeting 1 build sequence)

---

### DESIGN-001: Revise User Flows for Simplified MVP

**Title:** Update user-flows.md to reflect lean launch decisions

**Story:** As the design team, I want the user flow documentation to match the simplified 4-route, 7-screen architecture so that all agents reference a single source of truth during development.

**Acceptance Criteria:**
- [ ] Flows 2-5 and 8 from the original `user-flows.md` are removed (account, dashboard, multi-visit, settings, history)
- [ ] Happy path matches Meeting 1 spec: Landing --> Email Entry --> Magic Link Sent --> Verify --> Prediction Form --> Loading --> Results
- [ ] Error states documented: invalid email, expired link, used/invalid link, form validation, server error, PDF error
- [ ] Session model simplified to 2 states: ANONYMOUS --> VERIFIED (15-min disposable session)
- [ ] Route map shows 4 routes: `/`, `/auth`, `/predict`, `/results`
- [ ] All removed flows are noted as "Deferred to Phase 2" (not deleted)

**Owner:** `agent:inga`
**Dependencies:** None — can start immediately
**Sprint:** Design Sprint (pre-Sprint 1)

---

### DESIGN-002: Revise Wireframes for All 7 Screens at 3 Breakpoints

**Title:** Update wireframes.md with hi-fi screen specs for the lean launch

**Story:** As the frontend developer, I want pixel-accurate wireframes for all 7 screens at mobile (<768px), tablet (768-1024px), and desktop (>1024px) breakpoints so that I can build the prototype to exact specifications.

**Acceptance Criteria:**
- [ ] 7 screens wireframed: Landing, Email Entry, Magic Link Sent, Expired/Invalid Link, Prediction Form, Loading, Results
- [ ] Each screen specified at 3 breakpoints (mobile, tablet, desktop)
- [ ] Landing: single CTA, full-width button mobile, side-by-side hero+copy desktop, max-width 960px
- [ ] Email Entry: max-width 400px centered card on all breakpoints
- [ ] Magic Link Sent: deep-link buttons (Gmail, Outlook), 60s resend countdown, max-width 400px
- [ ] Expired Link: warning icon, "Send a new link" CTA, "Back to home" text link
- [ ] Prediction Form: single column mobile, 2-column desktop (max 640px), email read-only with lock icon, 4 NumberInputs with units and normal-range helper text, 56px submit button
- [ ] Loading: skeleton chart (200px mobile, 340px desktop), skeleton PDF button, `aria-busy="true"`
- [ ] Results: chart area (200px mobile, 280px tablet, 340px desktop), summary sentence above chart, PDF download button (full-width 56px mobile, auto-width desktop), footnote, disclaimer (sticky collapsed mobile, inline desktop)
- [ ] 3 dead screens from original wireframes removed and noted as deferred
- [ ] All spacing uses 8px grid; font sizes annotated (Inter)

**Owner:** `agent:inga`
**Dependencies:** DESIGN-001 (revised flows inform screen decisions)
**Sprint:** Design Sprint (pre-Sprint 1)

---

### DESIGN-003: Revise Component Specs for 21-Component Inventory

**Title:** Update component-specs.md to match the lean launch component inventory

**Story:** As the frontend developer, I want complete component specifications — props, responsive behavior, and accessibility attributes — for all 21 components so that I can implement them correctly in the prototype and production code.

**Acceptance Criteria:**
- [ ] 21 components specified across 5 groups: Auth (3), Form (4), Chart (10), Results (3), Layout (1+Footer absorbed)
- [ ] Each component spec includes: name, props with TypeScript types, responsive behavior per breakpoint, accessibility attributes
- [ ] ~8 removed components noted as deferred: SexRadioGroup, FormSection, OptionalFieldsSection, SilentFieldsSection, VisitDatePicker, StatCardGrid, StatCard, ConfidenceBadge, UnlockPrompt, SavePromptDialog, SignInForm, AuthBanner, AccountDashboard, HistoryPage
- [ ] New/updated components fully specified: NameInput, PDFDownloadButton, MagicLinkSent (with deep-link buttons), DisclaimerBlock (sticky mobile variant)
- [ ] NumberInput spec includes: `inputmode="numeric"` or `"decimal"`, min/max/step, unit display, helper text with normal ranges
- [ ] All touch targets annotated as 44px minimum; all inputs annotated as 16px font minimum

**Owner:** `agent:inga`
**Dependencies:** DESIGN-002 (wireframes inform component dimensions and layout)
**Sprint:** Design Sprint (pre-Sprint 1)

---

### DESIGN-004: Scaffold Next.js Prototype with Design Tokens

**Title:** Set up Next.js 15 + shadcn/ui prototype project with design tokens applied

**Story:** As a frontend developer, I want the prototype project scaffolded with the correct framework, component library, and design tokens so that every screen I build uses the approved typography, colors, spacing, and grid from day one.

**Acceptance Criteria:**
- [ ] Next.js 15 project initialized with App Router
- [ ] shadcn/ui installed and configured
- [ ] Tailwind CSS configured with design tokens in `globals.css`:
  - Inter font loaded (400, 500, 600, 700 weights)
  - Color palette from `design-tokens.md` applied as CSS custom properties
  - 8px spacing grid enforced via Tailwind spacing scale
  - Breakpoints: mobile <768px, tablet 768-1024px, desktop >1024px
- [ ] Layout wrapper component: max-width 960px centered, mobile padding 16px, desktop padding 32px
- [ ] Header component: logo as `<a href="/">` with `aria-label="KidneyHood home"`, responsive height (48px mobile, 56px tablet, 64px desktop)
- [ ] Footer/DisclaimerBlock shell in place
- [ ] Project runs locally with `npm run dev` — no errors, no warnings
- [ ] MSW (Mock Service Worker) installed for API mocking

**Owner:** `agent:harshit`
**Dependencies:** None — can start Day 1 in parallel with Inga's revisions
**Sprint:** Design Sprint (pre-Sprint 1)

---

### DESIGN-005: Build 7 Prototype Screens with Navigation

**Title:** Implement all 7 screens as prototype pages with working route navigation

**Story:** As the design reviewer, I want to click through all 7 screens in the prototype with real navigation so that I can evaluate the complete user flow before backend development begins.

**Acceptance Criteria:**
- [ ] 7 pages created matching the route map:
  - `/` — Landing page with "Get Started" CTA linking to `/auth`
  - `/auth` — Email entry view (default state)
  - `/auth` — Magic link sent view (swapped after submit, same route)
  - `/auth` — Expired/invalid link view (shown on token error)
  - `/predict` — Prediction form
  - `/results` — Loading skeleton (shown briefly) then results view
- [ ] Navigation works: Landing --> Auth --> (simulate verify) --> Predict --> Results
- [ ] "Get Started" button navigates to `/auth`
- [ ] Email submit swaps to Magic Link Sent view on same route
- [ ] "Open Gmail" / "Open Outlook" deep-link buttons present (link to real URLs)
- [ ] Resend button has 60s countdown timer (functional)
- [ ] Stubbed auth: clicking "I have a magic link" (or similar dev shortcut) advances to `/predict`
- [ ] Back navigation works correctly on all screens
- [ ] Responsive layout correct at all 3 breakpoints for every screen
- [ ] All text content matches Meeting 1 screen specs (headings, body copy, button labels)

**Owner:** `agent:harshit`
**Co-owner:** `agent:inga` (screen specs reference)
**Dependencies:** DESIGN-004 (scaffold must exist), DESIGN-002 (wireframes for pixel accuracy)
**Sprint:** Design Sprint (pre-Sprint 1)

---

### DESIGN-006: Implement Form Validation and Stubbed API

**Title:** Add working form inputs with client-side validation and MSW mock responses

**Story:** As the design reviewer, I want the prediction form to have real input behavior, validation feedback, and a simulated API response so that I can evaluate the form UX and error handling before real backend integration.

**Acceptance Criteria:**

**Form inputs:**
- [ ] Email field: read-only, gray background (#F8F9FA), lock icon, pre-filled with stubbed email
- [ ] Name field: text input, `autocomplete="name"`, required, validates on blur (non-empty)
- [ ] Age field: NumberInput, validates range (18-120), shows "years" unit
- [ ] BUN field: NumberInput, validates range (1-150), shows "mg/dL" unit, helper text "Normal range: 7-20"
- [ ] Creatinine field: NumberInput, validates range (0.1-30), shows "mg/dL" unit, helper text "Normal range: 0.6-1.2"
- [ ] Potassium field: NumberInput, validates range (1.0-10.0), shows "mEq/L" unit, helper text "Normal range: 3.5-5.0"
- [ ] All inputs: 48px height, 16px font, 44px touch targets

**Validation behavior:**
- [ ] Inline error messages appear on blur for out-of-range or missing values
- [ ] Red border on invalid fields with `aria-invalid="true"`
- [ ] Error summary banner appears above form on submit attempt with errors (`role="alert"`, focus-on-mount)
- [ ] Scroll to first error on submit attempt
- [ ] Tab order follows logical field sequence

**Submit and stubbed API:**
- [ ] "See My Prediction" button (56px, full-width, primary) triggers validation
- [ ] On valid submit: loading skeleton shows on `/results`, MSW returns hardcoded 4-trajectory response after 1.5s delay
- [ ] On simulated server error: toast banner "Something went wrong. Please try again." with form values preserved
- [ ] Chart area renders as labeled placeholder box ("Chart: 4 trajectories, [width] x [height]")
- [ ] PDF download button triggers 2s loading spinner then "Download complete" toast (no actual PDF)

**Owner:** `agent:harshit`
**Co-owner:** `agent:inga` (validation UX and error state specs)
**Dependencies:** DESIGN-005 (screens must exist to add form behavior)
**Sprint:** Design Sprint (pre-Sprint 1)

---

### DESIGN-007: Accessibility Baseline for Prototype

**Title:** Apply accessibility standards to all prototype screens

**Story:** As a 60+ CKD patient who may have visual or motor impairments, I want the prototype to meet baseline accessibility standards so that usability issues are caught before production code is written.

**Acceptance Criteria:**
- [ ] All touch targets minimum 44px (buttons, inputs, links)
- [ ] All form inputs have 16px minimum font size (prevents iOS zoom)
- [ ] Every input has an associated `<label>` with `htmlFor`
- [ ] `aria-describedby` on inputs pointing to helper text and error messages
- [ ] `aria-invalid` and `aria-required` on form fields where applicable
- [ ] `aria-busy="true"` on loading skeleton container
- [ ] `aria-disabled` on resend button during 60s cooldown with countdown in `aria-label`
- [ ] `aria-expanded` and `role="region"` on mobile disclaimer toggle
- [ ] Header logo: `<a href="/">` with `aria-label="KidneyHood home"`
- [ ] Error summary: `role="alert"`, `aria-live="assertive"`, focus-on-mount
- [ ] Chart placeholder: `role="img"` with descriptive `aria-label`
- [ ] Color contrast meets WCAG 2.1 AA on all text elements
- [ ] Run axe-core on all prototype pages: zero critical or serious violations

**Owner:** `agent:harshit`
**Co-owner:** `agent:inga` (accessibility plan reference, design compliance review)
**Dependencies:** DESIGN-006 (form and interactions must be implemented before a11y audit)
**Sprint:** Design Sprint (pre-Sprint 1)

---

### DESIGN-008: Prototype Review and Design Sign-Off

**Title:** Inga reviews the prototype against specs and provides formal sign-off

**Story:** As the UX/UI designer, I want to review the completed prototype against my wireframes, component specs, and design tokens so that I can confirm it accurately represents the intended design before backend development begins.

**Acceptance Criteria:**

**Review checklist (Inga verifies):**
- [ ] All 7 screens match wireframe layouts at all 3 breakpoints
- [ ] Typography matches design tokens (Inter font, correct weights, sizes)
- [ ] Color palette matches design tokens (no off-brand colors)
- [ ] 8px spacing grid is consistently applied
- [ ] Component dimensions match specs (button heights, input heights, max-widths)
- [ ] Form validation behavior matches error state specs from Meeting 1
- [ ] Navigation flow matches the approved happy path
- [ ] Error states are visually correct (inline errors, error summary, expired link, server error toast)
- [ ] Disclaimer behavior correct: sticky collapsed on mobile, inline on desktop
- [ ] PDF button placement and sizing correct per screen specs
- [ ] Deep-link buttons present and labeled correctly on Magic Link Sent screen
- [ ] Accessibility baseline confirmed (touch targets, font sizes, ARIA attributes)

**Sign-off outcome:**
- [ ] Inga creates an annotated review document listing any issues found
- [ ] Harshit addresses all blocking issues
- [ ] Inga provides written sign-off: "Prototype approved for development" or "Prototype approved with noted exceptions"
- [ ] Sign-off artifact stored in `agents/inga/drafts/`

**Owner:** `agent:inga`
**Co-owner:** `agent:harshit` (issue remediation)
**Dependencies:** DESIGN-007 (all screens, interactions, and a11y must be complete)
**Sprint:** Design Sprint (pre-Sprint 1)

---

## Dependency Map

```
No dependencies (start Day 1):
  DESIGN-001  Revise user flows                     (Inga)
  DESIGN-004  Scaffold Next.js prototype             (Harshit)

Inga's sequential chain:
  DESIGN-001 → DESIGN-002 → DESIGN-003
       ↓             ↓
  (user flows    (wireframes
   inform         inform
   screens)       components)

Harshit's sequential chain:
  DESIGN-004 → DESIGN-005 → DESIGN-006 → DESIGN-007
       ↑             ↑
  (scaffold)   (needs DESIGN-002
                wireframes for
                pixel accuracy)

Cross-agent dependencies:
  DESIGN-002 ──→ DESIGN-005  (Inga's wireframes feed Harshit's screen builds)
  DESIGN-003 ──→ DESIGN-006  (Inga's component specs feed Harshit's form implementation)
  DESIGN-007 ──→ DESIGN-008  (Harshit's complete prototype feeds Inga's review)

Sign-off gate:
  DESIGN-008 must complete before Sprint 1 backend work begins
```

## Critical Path

```
DESIGN-001 → DESIGN-002 → DESIGN-005 → DESIGN-006 → DESIGN-007 → DESIGN-008
                              ↑
DESIGN-004 ──────────────────┘
```

The critical path runs through: revised user flows --> revised wireframes --> prototype screens --> form + validation --> accessibility pass --> Inga's sign-off.

DESIGN-004 (scaffold) must complete before DESIGN-005 but is not on the critical path because it runs in parallel with Inga's DESIGN-001 and DESIGN-002.

**Bottleneck risk:** DESIGN-002 (wireframes) is the handoff point — if Inga's wireframes are late, Harshit's screen builds (DESIGN-005) are blocked. Mitigation: Inga delivers wireframes screen-by-screen so Harshit can start building as each screen is finalized.

---

## Day-by-Day Schedule (5 Days)

| Day | Inga | Harshit |
|-----|------|---------|
| 1 | DESIGN-001: Revise user flows | DESIGN-004: Scaffold project + design tokens |
| 2 | DESIGN-002: Wireframes (start) | DESIGN-004: Complete scaffold (Header, layout, MSW) |
| 2 | DESIGN-002: Deliver first screens | DESIGN-005: Build Landing, Auth screens |
| 3 | DESIGN-002: Complete wireframes | DESIGN-005: Build Form, Results screens |
| 3 | DESIGN-003: Component specs (start) | DESIGN-005: Complete all 7 screens |
| 4 | DESIGN-003: Complete component specs | DESIGN-006: Form validation + stubbed API |
| 5 | DESIGN-008: Review prototype | DESIGN-007: Accessibility pass |
| 5 | DESIGN-008: Sign-off | DESIGN-008: Address review findings |

---

## Agent Workload

| Agent | Owned | Co-owned | Stories |
|-------|-------|----------|---------|
| `agent:inga` | 4 | 1 | DESIGN-001, DESIGN-002, DESIGN-003, DESIGN-008 (owned); DESIGN-007 (co-owned) |
| `agent:harshit` | 4 | 3 | DESIGN-004, DESIGN-005, DESIGN-006, DESIGN-007 (owned); DESIGN-005, DESIGN-006, DESIGN-008 (co-owned) |
| `agent:husser` | 0 | 0 | Story author; available for scope clarification and acceptance |

---

## Relationship to Lean Launch Stories

These Design Sprint stories are a **prerequisite epic** that runs before Sprint 1. The LEAN-001 through LEAN-024 stories in `lean-launch-stories.md` assume the prototype and revised UX artifacts exist. Specifically:

| Design Sprint Deliverable | Lean Launch Stories That Depend on It |
|---------------------------|---------------------------------------|
| Revised user flows (DESIGN-001) | All stories reference the simplified 4-route flow |
| Revised wireframes (DESIGN-002) | LEAN-002, LEAN-011, LEAN-014, LEAN-016 (screen implementations) |
| Revised component specs (DESIGN-003) | LEAN-011, LEAN-012, LEAN-014, LEAN-015, LEAN-018, LEAN-019 (component builds) |
| Prototype sign-off (DESIGN-008) | Sprint 1 start gate — backend team begins only after sign-off |
