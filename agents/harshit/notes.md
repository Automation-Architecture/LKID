# Harshit — Frontend Developer Discovery Plan

**Date:** 2026-03-25
**Role:** Frontend Developer (Next.js 15)
**Project:** KidneyHood.org Patient Outcome Prediction App

---

## Meeting 1 Decisions

All 14 decisions from Meeting 1 are binding. Below is each decision and its impact on my frontend plan.

| # | Decision | FE Impact |
|---|----------|-----------|
| 1 | **Auth: Magic link only** — no password fields | Auth UI simplified: email entry -> magic link sent -> verify from URL. Remove any password-related fields/flows. |
| 2 | **MVP Scope: PDF DEFERRED** | Remove PDFDownloadButton, PDF generation logic, and PDF sprint work entirely. |
| 3 | **Sex field: Required** — Radio: Male/Female/Prefer not to say, after Age in form order | Update form field order: Age -> Sex (radio group). Already had SexSelection in component tree. |
| 4 | **Guest data: Server-side, 24hr TTL** — session token in httpOnly cookie, guest-to-account migration via API | No localStorage for guest data. Use httpOnly cookie (set by server). Migration = POST to server endpoint on account creation. |
| 5 | **X-axis: True linear time scale (months)** — compressed first year is intentional | Implement with Visx linear scale. No need for dual-version POC — true time scale is confirmed. |
| 6 | **Charting library: VISX APPROVED** — build POC in Sprint 0 | Visx is the charting library. No further evaluation needed. POC is my Sprint 0 action item. |
| 7 | **Frontend stack: shadcn/ui + Tailwind + Zustand + TanStack Query APPROVED. No BFF.** | Call FastAPI directly from client. No Next.js API routes as proxy. Remove BFF gray area. |
| 8 | **Predict endpoint: Separate concerns** — POST /lab-entries stores, POST /predict reads (auth) or accepts inline (guest) | Service layer needs two calls: one to store lab entries, one to get prediction. Guest flow sends inline data to /predict. |
| 9 | **Error response approved** — `{error: {code, message, details[{field, message}]}}` | Build error display components against this exact schema. Field-level errors map to form fields. |
| 10 | **No prediction result storage** — no GET /predictions endpoint, compute-on-demand | No cached prediction fetching. Every chart render requires a fresh POST /predict call. |
| 11 | **Disclaimer: Sticky footer on mobile, inline on desktop** — per Inga's spec | Implement responsive disclaimer: `<DisclaimerFooter>` (sticky, mobile) and `<DisclaimerBlock>` (inline, desktop). |
| 12 | **Tier transitions: Both hemoglobin AND glucose for Tier 2** | Unlock prompt logic: Tier 2 requires BOTH optional fields, not either/or. Update conditional display. |
| 13 | **Test vectors from Lee** | Will inform mock data accuracy once received. Update MSW handlers accordingly. |
| 14 | **Audit log** | No FE impact. |

---

## 1. Role and Deliverables

I own the entire Next.js 15 frontend application. My deliverables span five major areas:

### 1.1 Next.js 15 App Router Application

- Project scaffolding with Next.js 15 App Router (not Pages Router)
- Route structure: `/` (landing/form), `/results` (chart + cards), `/auth/login`, `/auth/verify`, `/account`, `/account/history`
- Server components where possible, client components only where interactivity demands it (form, chart, auth flows)
- Layout hierarchy: root layout (global styles, fonts, disclaimers footer), auth layout (magic link flow), dashboard layout (account views)
- **No BFF pattern** — call FastAPI directly from client (Decision #7)

### 1.2 Patient Input Form

- **Required fields:** BUN, Creatinine, Potassium, Age, Sex (5 fields)
- **Sex field:** Radio group — Male / Female / Prefer not to say. Positioned after Age in form order (Decision #3)
- **Optional fields:** Hemoglobin, Glucose, eGFR override
- **Silently collected fields:** Systolic BP, SGLT2 inhibitor use, Proteinuria (UPCR/UACR with unit), CKD diagnosis type
- Client-side validation with min/max ranges (BUN 5-150, Creatinine 0.3-15.0, Potassium 2.0-8.0, Age 18-99, Hemoglobin 4.0-20.0, Glucose 40-500)
- Inline field-level error messages from API error schema (Decision #9): map `details[].field` to form fields
- Disabled submit until required fields pass
- Progressive disclosure: required fields first, then "Add more labs to improve accuracy" expandable section for optional fields
- Visit date field for multi-visit entries (SPEC-66)
- **Unlock prompt:** "Add hemoglobin AND glucose to improve prediction accuracy" (Decision #12 — both required for Tier 2)

### 1.3 eGFR Trajectory Chart (Visx)

- **Library:** Visx (Decision #6) — D3 primitives wrapped in React components
- **Chart type:** Line chart with 4 trajectory lines (none, bun24, bun17, bun12)
- **15 data points** at non-uniform intervals: 0, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120 months
- **X-axis:** True linear time scale in months (Decision #5), labeled with patient ages. First year is compressed — this is intentional per Luca's decision.
- **Y-axis:** eGFR (mL/min/1.73m2), min 0, max = highest bun12 value + 12 buffer
- **Dialysis threshold:** Horizontal dashed red line at eGFR 12
- **Line styles:** Exact colors and dash patterns per spec Section 4.4 (#AAAAAA dashed, #85B7EB short dash, #378ADD solid, #1D9E75 solid heaviest)
- **Phase bands:** Phase 1 (months 0-3) gray, Phase 2 (months 3-24) light green, rendered below lines
- **Start/end labels:** Filled dot at index 0, end-of-line eGFR values with 15px minimum vertical separation (collision avoidance)
- **Confidence tier badge:** Top-right corner, 3 tiers with distinct visual states
- **Unlock prompts:** Conditional display based on confidence tier
- **Compute-on-demand:** Every render requires fresh POST /predict (Decision #10)

### 1.4 Stat Cards

- 4-column grid below chart: No Treatment, BUN 18-24, BUN 13-17, BUN <=12
- Each card: 3px top border in line color, eGFR value, delta from starting, sub-text
- Dynamic content from API response (trajectories last element, dial_ages, egfr_calculated)
- Responsive collapse: 4-col desktop > 2x2 tablet > single stack mobile

### 1.5 Magic Link Authentication Flow UI

- **Magic link only** — no password fields anywhere (Decision #1)
- Email entry form (post-prediction prompt — never before chart renders)
- "Magic link sent" confirmation screen
- Magic link verification page (token from URL)
- **Guest session:** httpOnly cookie with server-side session token, 24hr TTL (Decision #4)
- Guest-to-account data migration: call server API endpoint on account creation (Decision #4)
- JWT token storage and management for authenticated sessions
- "Save your results" prompt component shown after chart renders (SPEC-21)

### 1.6 Legal Disclaimers

- Three verbatim disclaimer texts on every screen showing a prediction (spec Section 6)
- **Desktop:** Inline below chart/cards (Decision #11)
- **Mobile:** Sticky footer with expand-on-tap (Decision #11), per Inga's spec

---

## 2. Role Boundaries

### What I do:

- Build all React/Next.js components, pages, and routes
- Implement client-side form validation
- Render charts and visualizations from API response data (using Visx)
- Handle auth flow UI (email entry, magic link verification, session management)
- Implement responsive layouts across breakpoints
- Implement accessibility (WCAG 2.0 per proposal)
- Create mock API responses (MSW) for parallel development

### What I do NOT do:

- Design the UX/UI — that is Inga's domain. I implement her component specs and wireframes.
- Build the API or define endpoints — that is John Donaldson's domain. I consume the API contract he publishes.
- Design the database schema — that is Gay Mark's domain.
- Define product scope or acceptance criteria — that is Husser's domain.
- Write test plans or perform QA — that is Yuri's domain. I provide testable components.
- Make architectural decisions about the backend or infrastructure.

### Resolved gray areas:

- ~~Client-side vs. server-side PDF generation~~ — **PDF deferred from MVP** (Decision #2).
- ~~Next.js API routes as BFF~~ — **No BFF. Call FastAPI directly** (Decision #7).
- **eGFR client-side calculation** — still open. Should FE calculate eGFR from creatinine/age/sex and pre-fill, or leave that entirely to the server?

---

## 3. Dependencies I Have on Other Agents

### From Inga (UX/UI Designer) — BLOCKING

| Need | Why | When |
|------|-----|------|
| Component specs and wireframes | Cannot build pixel-accurate UI without design specs | Before Sprint 1 |
| Responsive breakpoint strategy | Need confirmed breakpoints (mobile/tablet/desktop) and layout rules | Before Sprint 1 |
| Color palette, typography, spacing system | Need design tokens for consistent implementation | Before Sprint 1 |
| Form field layout and flow | Input ordering, progressive disclosure approach, error state visuals | Before Sprint 1 |
| Chart visual refinements | Any adjustments to the spec Section 4 chart rendering | Before chart implementation |
| Mobile chart interaction patterns | Pinch-to-zoom, horizontal scroll, or simplified mobile chart | Before responsive work |
| Auth flow screens (magic link only) | Email entry, confirmation, verification page designs | Before auth UI work |
| Disclaimer sticky footer design (mobile) | Need exact design for collapsed/expanded states (Decision #11) | Before disclaimer implementation |

### From John Donaldson (API Designer) — BLOCKING

| Need | Why | When |
|------|-----|------|
| Finalized API contract (OpenAPI/JSON) | Need exact request/response schemas to build service layer and types | Before API integration |
| POST /lab-entries and POST /predict schemas | Separate concerns per Decision #8 — need both endpoint contracts | Before service layer |
| Error response confirmation | Confirmed schema: `{error: {code, message, details[{field, message}]}}` (Decision #9) | Before form validation |
| Multi-visit endpoint design | Need to know if GET/POST /visits exists or if /predict accepts arrays | Before multi-visit UI |
| Auth endpoints contract | POST /login (magic link), POST /verify, GET /me — request/response shapes | Before auth implementation |
| CORS and cookie configuration | httpOnly cookie setup for guest sessions (Decision #4) | Before integration |

### From Husser (Product Manager) — BLOCKING

| Need | Why | When |
|------|-----|------|
| Confirmation of MVP scope | Which Jira stories are in vs. out for MVP (PDF confirmed out — Decision #2) | Before Sprint 1 |
| Acceptance criteria for each story | Clear done-definition for my frontend stories | Before each sprint |

### From Gay Mark (Database Engineer) — NON-BLOCKING

| Need | Why | When |
|------|-----|------|
| Understanding of data model | Helps me design frontend state that maps cleanly to persistence | During Discovery |

### From Lee (Test Vectors) — NON-BLOCKING

| Need | Why | When |
|------|-----|------|
| Test vectors (Decision #13) | Will inform mock data accuracy for MSW handlers | Before Sprint 1 ideally |

### From Luca (CTO) — RESOLVED

All Meeting 1 decisions received. No outstanding decision requests.

---

## 4. Dependencies Other Agents Have on Me

### Yuri (QA) depends on me for:

| What | Why | When |
|------|-----|------|
| Deployed frontend for E2E testing | Cannot run Playwright/Cypress tests without a running app | Before QA sprint |
| Component test surface | Need accessible selectors (data-testid attributes) on all interactive elements | During implementation |
| Storybook or component documentation | Helps Yuri understand component states for test case design | During implementation |
| Accessibility compliance | WCAG 2.0 audit requires rendered pages | Before launch |

### Inga (UX/UI) depends on me for:

| What | Why | When |
|------|-----|------|
| Feasibility feedback on designs | Chart rendering limitations, responsive constraints, animation performance | During Discovery |
| Visx capabilities report | What Visx can and cannot do: custom dash patterns, phase bands, label positioning, non-uniform axes | After POC (Sprint 0) |
| Prototype/demo of chart rendering | Visual proof that the chart spec is achievable via Visx POC | During parallel drafting |

### John Donaldson (API) depends on me for:

| What | Why | When |
|------|-----|------|
| Frontend data requirements | Any additional fields or response shape changes needed | During Discovery |
| Confirmation of API contract from FE perspective | Sign-off that the contract meets all frontend rendering needs | Before implementation |

---

## 5. Risks and Concerns

### HIGH RISK

**R1: Visx POC must validate all chart requirements.** ~~RESOLVED: Library selection~~. Visx is approved (Decision #6). The risk now shifts to POC execution — I must prove that Visx can deliver: non-uniform x-axis spacing (true linear time scale), custom dash patterns (7px/4px, 3px/2px), phase background bands, start/end point labels with collision avoidance (15px separation), and a dialysis threshold line.

*Mitigation:* Build the POC in Sprint 0 as my primary action item. If any requirement proves infeasible with Visx, escalate to Luca immediately.

**R2: Non-uniform x-axis — compressed first year.** ~~RESOLVED: True linear time scale confirmed~~ (Decision #5). The first year (5 data points in months 0-12) will be compressed into 10% of the axis width. This is intentional per Luca's decision.

*Mitigation:* Ensure enhanced tick marks and clear labeling in the compressed early region. Validate readability in POC.

### MEDIUM RISK

**R3: Disclaimer sticky footer requires Inga's design.**
Mobile sticky footer with expand-on-tap is confirmed (Decision #11), but Inga needs to provide the exact design for collapsed/expanded states.

*Mitigation:* Flag as blocking dependency on Inga for Sprint 2.

**R4: Responsive stat card layout needs design direction.**
The spec defines a 4-column grid. On mobile, this is unusable. Proposed breakpoints: >1024px = 4-col, 768-1024px = 2x2, <768px = single stack.

*Mitigation:* Flag as a dependency on Inga. Use proposed breakpoints as defaults.

**R5: Magic link auth flow has no UX spec.**
Auth mechanism is magic-link-only (Decision #1), but Inga needs to produce auth flow wireframes: email entry screen, "link sent" confirmation, verification page, expired link handling.

*Mitigation:* Inga needs to produce auth flow wireframes. I can provide feasibility input on Next.js 15 middleware for auth redirects.

**R6: Multi-visit data flow is architecturally ambiguous.**
Spec review issue #4 (HIGH). POST /lab-entries stores (Decision #8), but multi-visit flow — does /predict pull all stored entries for auth users? How does guest multi-visit work with server-side sessions (Decision #4)?

*Mitigation:* John Donaldson must resolve this in the API contract.

### LOW RISK

**R7: Accessibility (WCAG 2.0) for 60+ audience.**
Patients aged 60+: large touch targets (44px minimum), sufficient color contrast, screen reader support for chart data, keyboard navigation. SVG charts (Visx) need ARIA labels and a data table alternative.

*Mitigation:* Plan accessibility from day one. Include ARIA attributes in Visx chart components. Provide a visually hidden data table as screen reader alternative.

**R8: Confidence tier UI state complexity.**
Three tiers, each with different badge visuals, unlock prompts, and conditional UI. Tier 2 requires BOTH hemoglobin AND glucose (Decision #12), not just one.

*Mitigation:* Tier transition rules confirmed. Implement clear conditional logic in UnlockPrompt component.

### RESOLVED RISKS

- ~~R-PDF: PDF generation approach affects architecture~~ — PDF deferred from MVP (Decision #2).
- ~~Charting library selection is a one-way door~~ — Visx approved (Decision #6).
- ~~Non-uniform x-axis visual accuracy vs. readability tradeoff~~ — True linear time scale confirmed (Decision #5).

---

## 6. Approved Frontend Stack

| Layer | Choice | Status |
|-------|--------|--------|
| Framework | Next.js 15 App Router | Approved |
| Charting | Visx | Approved (Decision #6) |
| UI Components | shadcn/ui | Approved (Decision #7) |
| Styling | Tailwind CSS | Approved (Decision #7) |
| Client State | Zustand | Approved (Decision #7) |
| Server State | TanStack Query | Approved (Decision #7) |
| API Communication | Direct to FastAPI (no BFF) | Approved (Decision #7) |
| Mock API | MSW (Mock Service Worker) | Planned |

---

## 7. Technical Approach

### 7.1 Next.js 15 App Router Structure

```
app/
  layout.tsx              # Root layout: global styles, fonts, metadata
  page.tsx                # Landing page with prediction form
  results/
    page.tsx              # Chart + stat cards + disclaimers (client component)
  auth/
    login/page.tsx        # Magic link email entry (no password fields)
    verify/page.tsx       # Magic link verification (reads token from URL)
  account/
    layout.tsx            # Authenticated layout (redirects if no session)
    page.tsx              # Account dashboard
    history/page.tsx      # Historical lab entries and trend
```

No `api/` routes — direct FastAPI calls per Decision #7.

### 7.2 Component Tree

```
<RootLayout>
  <Header />                          # Logo, nav, auth status
  <main>
    <PredictionForm>                   # Client component
      <RequiredFieldsSection>
        <BUNInput />
        <CreatinineInput />
        <PotassiumInput />
        <AgeInput />
        <SexRadioGroup />             # Male/Female/Prefer not to say (Decision #3)
      </RequiredFieldsSection>
      <OptionalFieldsSection>         # Collapsible
        <HemoglobinInput />
        <GlucoseInput />
        <EGFROverrideInput />
      </OptionalFieldsSection>
      <SilentFieldsSection>           # Below optional, unobtrusive
        <SystolicBPInput />
        <SGLT2Toggle />
        <ProteinuriaInput />
        <CKDDiagnosisDropdown />
      </SilentFieldsSection>
      <VisitDatePicker />
      <SubmitButton />
    </PredictionForm>

    <PredictionResults>               # Client component
      <PredictionChart>               # Visx-based (Decision #6)
        <ChartTitle />
        <ChartSubtitle />
        <PhaseBands />
        <TrajectoryLines />
        <DialysisThresholdLine />
        <AxisLabels />
        <StartPointLabel />
        <EndPointLabels />
        <ConfidenceTierBadge />
      </PredictionChart>
      <StatCardGrid>
        <StatCard variant="none" />
        <StatCard variant="bun24" />
        <StatCard variant="bun17" />
        <StatCard variant="bun12" />
      </StatCardGrid>
      <UnlockPrompt />                # Conditional on confidence tier (both hgb+glu for Tier 2)
      <SlopeTag />                    # Conditional on visit count
      <DisclaimerBlock />             # Desktop: inline (Decision #11)
      <SavePrompt />                  # Post-prediction account creation prompt
    </PredictionResults>
  </main>
  <DisclaimerFooter />                # Mobile: sticky footer with expand-on-tap (Decision #11)
</RootLayout>
```

### 7.3 Service Layer (Two-Endpoint Pattern)

Per Decision #8, the predict flow uses separate concerns:

**Authenticated users:**
1. `POST /lab-entries` — stores lab values (via TanStack Query mutation)
2. `POST /predict` — reads stored entries, returns prediction (compute-on-demand, Decision #10)

**Guest users:**
1. `POST /predict` with inline lab data — no storage, session token in httpOnly cookie (Decision #4)
2. On account creation: server-side migration of guest session data (Decision #4)

### 7.4 Parallel Development with Mocks

Per contract-first approach:

1. **Define TypeScript types** from the API contract as soon as John publishes it.
2. **Create MSW mock handlers** that return realistic prediction responses, including:
   - Prediction response matching spec Section 3.2 (all 4 trajectory arrays, dial_ages, confidence tiers 1/2/3)
   - Error responses matching `{error: {code, message, details[{field, message}]}}` (Decision #9)
   - Auth responses (magic link sent, verification success/failure, user profile)
   - Multi-visit responses (1 visit, 2 visits, 3+ visits with slope data)
3. **Update mock data accuracy** once Lee's test vectors arrive (Decision #13).
4. **Build all frontend components against mocks** — form submission, chart rendering, stat cards, auth flow.
5. **Integration happens last** — swap mock handlers for real API calls once FastAPI endpoints are ready.

### 7.5 Responsive Strategy

| Breakpoint | Layout |
|------------|--------|
| Desktop (>1024px) | Full chart width, 4-col stat cards, side margins, disclaimers inline below cards |
| Tablet (768-1024px) | Full chart width, 2x2 stat cards, disclaimers inline |
| Mobile (<768px) | Chart with horizontal scroll or pinch-zoom, single-col stacked cards, sticky disclaimer footer (Decision #11) |

Touch targets: minimum 44px for all interactive elements (buttons, radio buttons, form fields).
Font sizes: minimum 16px for form inputs (prevents iOS zoom on focus).

### 7.6 Accessibility Plan

- Semantic HTML throughout (form elements with labels, headings hierarchy)
- ARIA labels on Visx SVG chart elements
- Hidden data table alternative for screen readers (all trajectory values in tabular form)
- Keyboard navigation for form, chart tooltips, and auth flow
- Color contrast ratios meeting WCAG AA (4.5:1 for text, 3:1 for large text)
- Focus indicators on all interactive elements
- Skip-to-content link
- Test with VoiceOver (macOS/iOS) and screen reader simulation

---

## 8. Frontend Jira Stories I Own

Based on the SPEC backlog, these are the stories labeled `next-js/react` that fall under my responsibility:

### Epic 1 — Patient Input Form (FE)
- SPEC-2: Build Required Input Form Fields
- SPEC-3: Implement Frontend Form Validation
- SPEC-4: Build Optional Input Fields
- SPEC-5: Build Silently Collected Input Fields
- SPEC-10: Integrate Frontend with Prediction API

### Epic 2 — Prediction Output & Visualization
- SPEC-8: Implement Chart Rendering Component (Base) — **Visx**
- SPEC-9: Render X-Axis (Age-based) — **true linear time scale**
- SPEC-11: Plot Trajectory Lines with Styles
- SPEC-12: Render Chart Title & Subtitle
- SPEC-13: Render Y-Axis (eGFR) & Dialysis Threshold
- SPEC-14: Implement Required Disclaimers — **sticky footer mobile, inline desktop**
- SPEC-15: Implement Phase Band Rendering
- SPEC-16: Build Stat Card Components (Layout & Content)
- SPEC-17: Render Confidence Tier Badge & Unlock Prompts — **both hgb+glu for Tier 2**

### Epic 3 — User Accounts & Multi-Lab Entry (FE)
- SPEC-19: Implement User Login (FE) — **magic link only, no password**
- SPEC-18: Implement Guest Mode & Session Management (FE parts: SPEC-61) — **server-side, httpOnly cookie, 24hr TTL**
- SPEC-21: Display Save/Account Prompt Post-Prediction
- SPEC-24: Implement Multi-Visit Date Entry (FE/BE — FE portion)
- SPEC-26: Implement Slope Display Logic (FE)
- SPEC-23: Integrate FE Form with Account Data Save — **POST /lab-entries + POST /predict**

### Epic 4 — Operational & Legal Compliance (FE)
- SPEC-27: Legal Disclaimer Integration

**Total frontend stories: ~18** (reduced from ~20 after PDF removal)
**Estimated effort: ~22-26 days** (reduced after PDF removal)

---

## 9. Proposed Sprint Sequence (Frontend)

**Sprint 0 (Discovery outputs):**
- **Visx charting library POC** (primary action item — Decision #6)
  - Validate: non-uniform true linear time axis
  - Validate: custom dash patterns (7px/4px, 3px/2px)
  - Validate: phase background bands
  - Validate: end-of-line label collision avoidance (15px separation)
  - Validate: dialysis threshold line
- TypeScript type definitions from API contract
- MSW mock API setup (handlers based on John's contract)
- Component architecture finalized

**Sprint 1 — Core Form + Chart:**
- SPEC-2, SPEC-3 (required input form with validation, sex radio group)
- SPEC-8, SPEC-9, SPEC-11, SPEC-12, SPEC-13 (Visx chart base, axes, lines, title)
- SPEC-10 (API integration with mocks — two-endpoint pattern)

**Sprint 2 — Cards + Polish + Optional Fields:**
- SPEC-16 (stat cards)
- SPEC-14 (disclaimers — sticky footer mobile, inline desktop)
- SPEC-15 (phase bands)
- SPEC-17 (confidence tier badge — both hgb+glu for Tier 2)
- SPEC-4, SPEC-5 (optional and silent fields)

**Sprint 3 — Auth + Accounts:**
- SPEC-19 (magic link login FE — no password fields)
- SPEC-18/SPEC-61 (guest session management — server-side httpOnly cookie)
- SPEC-21 (save prompt)
- SPEC-23 (FE + account data save — POST /lab-entries integration)

**Sprint 4 — Multi-Visit + Slope + Polish:**
- SPEC-24/SPEC-66, SPEC-71 (multi-visit date entry, historical display)
- SPEC-26 (slope display logic)
- SPEC-27 (legal disclaimer integration — final pass)
- Responsive polish and accessibility audit

---

## 10. Remaining Open Questions

1. **eGFR client-side calculation:** Should the frontend calculate eGFR from creatinine/age/sex to pre-fill the optional eGFR field, or leave that entirely to the server?
2. **Klaviyo integration:** Is this in MVP scope? If so, does the frontend need to trigger any Klaviyo events?
3. **Geo-restriction:** US-only with IP geolocation — where does the redirect happen? Next.js middleware or backend?

~~PDF scope for MVP~~ — Resolved: deferred (Decision #2).
~~Next.js server-side scope / BFF~~ — Resolved: no BFF, direct FastAPI calls (Decision #7).
~~Charting library~~ — Resolved: Visx (Decision #6).
~~Guest session storage~~ — Resolved: server-side, httpOnly cookie, 24hr TTL (Decision #4).

---

## Post-Meeting Action Items

### My Action Items (from Meeting 1)

| # | Action | Deliverable | Due |
|---|--------|-------------|-----|
| 1 | **Build Visx charting POC** | Working POC demonstrating: non-uniform linear time axis, dash patterns, phase bands, label collision avoidance, dialysis threshold | End of Sprint 0 |
| 2 | **Create MSW mock handlers** | Mock handlers for POST /lab-entries, POST /predict, POST /auth/login, POST /auth/verify, GET /me — based on John's API contract | End of Sprint 0 |
| 3 | **Validate chart requirements** | Written report on Visx feasibility for each chart requirement; escalate blockers to Luca | End of Sprint 0 |

### Waiting On

| From | What | Status |
|------|------|--------|
| John Donaldson | API contract (OpenAPI) for /lab-entries, /predict, auth endpoints | Pending |
| Inga | Auth flow wireframes (magic link only) | Pending |
| Inga | Disclaimer sticky footer design (mobile) | Pending |
| Lee | Test vectors for mock data accuracy | Pending (Decision #13) |

---

*Revised by Harshit after Meeting 1 — 2026-03-25*
*All 14 binding decisions incorporated.*
