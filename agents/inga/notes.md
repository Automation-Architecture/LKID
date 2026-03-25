# Inga -- Senior UX/UI Designer
## Discovery Phase: Post-Meeting 1 Notes

---

## Meeting 1 Decisions (UX/UI Impact Summary)

All 14 decisions from Meeting 1 are binding. Below are those that directly affect UX/UI work, with status and implications.

| # | Decision | UX Impact |
|---|----------|-----------|
| 1 | **Auth: Magic link only.** No passwords. | CONFIRMED. My proposed flow (email > link > verify > account) is approved. Remove any password-related UI. Auth wireframes proceed as planned. |
| 2 | **PDF DEFERRED to Phase 2b.** | CONFIRMED. Remove PDF download button, email trigger, and PDF layout spec from MVP scope. Results screen simplified. |
| 3 | **Sex field: Required.** Radio: Male / Female / Prefer not to say. | CONFIRMED. Placement: after Age, before optional fields. Form layout updated. |
| 4 | **Guest data: Server-side, 24hr TTL.** | CONFIRMED. Design save prompt with clear messaging: "Your results will be available for 24 hours. Create an account to save them permanently." |
| 5 | **X-axis: True linear time scale (months).** Compressed first year. Footer note required. | CONFIRMED. My proposed solution adopted. Chart footnote: "Data points are plotted at actual time intervals. Early measurements are more frequent." |
| 6 | **Charting library: Visx.** Harshit builds POC. TWO chart spec variants required (ideal + simplified fallback). | CONFIRMED. I must prepare both variants. Visx is SVG-based, highly customizable but requires more manual specification than higher-level libraries. |
| 7 | **Frontend stack: shadcn/ui + Tailwind.** | CONFIRMED. My design tokens map directly to Tailwind CSS variables. Component specs reference shadcn/ui primitives. |
| 9 | **Error response envelope approved.** | CONFIRMED. Design inline validation and error states against the approved envelope schema. |
| 11 | **Disclaimer mobile: Sticky footer APPROVED.** Husser confirms with legal. | CONFIRMED. Collapsed single-line footer on mobile, expandable on tap. Inline on desktop. |
| 12 | **Tier transitions: BOTH hemoglobin AND glucose required for Tier 2.** | CONFIRMED. Update unlock prompt copy: "Add both your hemoglobin and glucose results to sharpen your prediction." |

Decisions with no direct UX impact (acknowledged): #8 (separate predict endpoint), #10 (no prediction result storage), #13 (test vectors), #14 (audit log ON DELETE SET NULL).

---

## 1. Role and Deliverables

I own all user experience and interface design decisions for the KidneyHood Patient Outcome Prediction App. My deliverables during Discovery and into the Development Phase are:

### Discovery Phase Deliverables
- **Complete user flow diagrams** -- every path from landing to results, including guest mode, account creation, multi-visit re-entry, and error recovery
- **Wireframes** for all screens at three breakpoints (mobile, tablet, desktop)
- **Component specification document** -- props, states, variants, spacing, and behavior for every UI component
- **Responsive strategy document** -- breakpoints, layout rules, collapse behavior, touch targets
- **Accessibility plan** -- WCAG 2.1 AA compliance checklist, screen reader flow, keyboard navigation map, color contrast verification for all chart colors
- **Design tokens specification** -- color palette, typography scale, spacing scale, border radii, shadows, mapped to Tailwind CSS variables
- **Chart interaction specification** -- TWO variants (ideal + simplified fallback) specifying how the eGFR trajectory chart behaves at each breakpoint, touch vs. mouse, label placement, tooltip behavior, using Visx

### Development Phase Deliverables
- Finalized high-fidelity mockups (all states: empty, loading, populated, error)
- Component library documentation for Harshit to implement (referencing shadcn/ui primitives)
- UX acceptance criteria for every Jira story that has a UI surface

---

## 2. Role Boundaries

**I design. I do not code, and I do not define product scope.**

Specifically:
- I specify *how* features look and behave, not *what* features exist (that is Husser's domain)
- I produce wireframes, flows, and component specs -- I do not write React components or CSS (that is Harshit's domain)
- I define responsive layouts and breakpoints but defer to Harshit on implementation constraints (Visx capabilities, Tailwind/shadcn patterns)
- I define the visual representation of API responses but do not define the API contract itself (that is John Donaldson's domain)
- I specify what data appears on each screen but defer to Gay Mark on storage and persistence concerns
- I will flag UX implications of technical decisions but will not override engineering constraints without escalation to Luca

---

## 3. Dependencies I Have on Other Agents

### From Husser (Product Manager)
- ~~Open Question #1: Sex field required or optional?~~ **RESOLVED: Required. Radio: Male/Female/Prefer not to say. After Age, before optional fields.**
- ~~Open Question #2: Guest mode 24-hour retention window~~ **RESOLVED: Server-side, 24hr TTL.**
- Open Question #3: Account creation timing (confirmed as post-prediction, but I need the exact trigger and prompt copy)
- Open Question #5: Platform confirmation (responsive web only for MVP) -- assumed confirmed
- Open Question #6: HIPAA compliance scope (affects what consent UI I need to design)
- ~~PDF export scope decision~~ **RESOLVED: Deferred to Phase 2b.**
- **Scope of "silently collected" fields** -- are systolic BP, SGLT2 use, proteinuria, and CKD diagnosis all on the same form screen, or gated behind progressive disclosure?
- **Legal confirmation on sticky disclaimer footer** -- Husser is confirming with legal counsel

### From John Donaldson (API Designer)
- **Finalized API contract** including the approved error response envelope -- I need the exact field names to design inline validation states
- **Validation ranges** for all numeric inputs (BUN 5-150, Creatinine 0.3-15.0, etc.) -- these drive helper text and error messages
- **Multi-visit endpoint design** -- whether visits are sent as an array or retrieved by account token affects the multi-visit entry UX

### From Gay Mark (Database Engineer)
- **Guest-to-account migration behavior** -- does session data auto-migrate on account creation, or does the user need to re-enter? (Guest data is server-side with 24hr TTL -- confirmed)

### From Harshit (Frontend Developer)
- ~~Charting library selection~~ **RESOLVED: Visx.** Harshit building POC. I need POC results to finalize which chart variant to pursue.
- ~~CSS/component framework choice~~ **RESOLVED: shadcn/ui + Tailwind.**
- **Next.js 15 constraints** -- server components vs. client components; does this affect how I think about loading states and transitions?
- **Visx POC results** -- specifically: custom dash patterns, phase band fills, end-of-line labels, tooltip on hover/tap, true linear time axis support

---

## 4. Dependencies Other Agents Have on Me

### Harshit (Frontend Developer) needs from me:
- **Component specs for every UI element** -- before he can build SPEC-2 through SPEC-58, he needs my wireframes defining layout, spacing, typography, and states
- **Responsive breakpoint rules** -- how the 4-column stat card grid collapses, how the chart behaves on mobile, and minimum touch targets (44px)
- **Form field ordering and grouping** -- required fields (BUN, Creatinine, Potassium, Age, Sex), optional fields (Hemoglobin, Glucose), and silently collected fields need clear visual hierarchy and grouping
- **TWO chart spec variants** -- ideal (full Visx customization) and simplified fallback (reduced features if POC reveals constraints)
- **Chart label placement rules** -- end-of-line eGFR values with 15px separation, rotated x-axis labels, phase band labels -- all need precise specs
- **Error state designs** -- inline validation against the approved error envelope, toast/banner for server errors, disabled submit button behavior
- **Loading state designs** -- what the user sees between form submission and chart render
- **Design tokens mapped to Tailwind CSS variables** -- direct mapping for implementation

### Yuri (Test Writer / QA) needs from me:
- **UX acceptance criteria** for every story with a UI surface -- "the stat cards display in a 4-column grid on desktop and stack vertically on mobile" is a testable criterion
- **Accessibility requirements** -- screen reader announcements, keyboard tab order, focus management after form submission
- **Visual regression baselines** -- reference screenshots at each breakpoint for visual QA
- **Edge case specifications** -- what happens when dial_ages.none is null? What does the "No treatment" card say? What if all trajectories converge?

---

## 5. Risks and Concerns

### HIGH RISK: eGFR Chart Visualization Complexity (PARTIALLY MITIGATED)
The chart spec (Section 4) is the most complex UI element in the application. It combines:
- 4 trajectory lines with distinct styles (solid, dashed, short-dash) and weights
- True linear time scale in months with compressed first year (CONFIRMED -- Decision #5)
- Phase bands as background fills with z-index requirements
- End-of-line labels that must not overlap (15px minimum separation)
- A confidence tier badge
- Stat cards below that derive from trajectory data

**Status:** Visx selected (Decision #6). Visx is low-level SVG, meaning high customizability but more specification effort. Harshit is building a POC. I am preparing TWO variants: ideal and simplified fallback.

**Remaining risk:** POC may reveal that some features (e.g., custom dash patterns on specific line segments, phase band fills with transparency) require significant custom SVG work. The simplified fallback mitigates this.

### ~~HIGH RISK: Disclaimer Placement vs. "No Scrolling" Requirement~~ RESOLVED
**Decision #11:** Sticky footer on mobile APPROVED. Collapsed to one line, expandable on tap. Inline on desktop. Husser confirming with legal.

### MEDIUM RISK: Audience Is 60+ and Potentially Low Digital Literacy
The proposal explicitly states the audience is 60+ years old, many managing CKD, and many accessing from mobile devices. This imposes serious constraints:
- Font sizes must be generous (minimum 16px body, 14px minimum for any text)
- Touch targets must be 44px minimum (WCAG 2.5.5)
- Form inputs need large hit areas, clear labels, and explicit units
- Error messages must be plain language ("Your BUN value should be between 5 and 150"), not clinical jargon
- The magic link auth flow must be dead simple -- no password to remember (CONFIRMED -- Decision #1)
- Color alone cannot convey meaning (color blindness prevalence increases with age)

**Mitigation:** I will design mobile-first and scale up, not desktop-first and scale down. Every design decision will be tested against the question: "Can a 68-year-old with declining vision use this on a phone?"

### ~~MEDIUM RISK: PDF Generation UX Is Unspecified~~ RESOLVED
**Decision #2:** PDF deferred to Phase 2b. No PDF components in MVP. No placeholder buttons.

### ~~MEDIUM RISK: Non-Linear X-Axis Creates Visual Distortion~~ RESOLVED
**Decision #5:** True linear time scale in months. Chart footnote required: "Data points are plotted at actual time intervals. Early measurements are more frequent."

### ~~LOW RISK: Confidence Tier Transition Rules Need Clarification~~ RESOLVED
**Decision #12:** BOTH hemoglobin AND glucose required for Tier 2. Unlock prompt copy updated: "Add both your hemoglobin and glucose results to sharpen your prediction."

---

## 6. Key UX Decisions (Post-Meeting 1 Status)

### Decision 1: Patient Flow Architecture -- CONFIRMED

```
Landing Page
    |
    v
Lab Entry Form (required fields: BUN, Creatinine, Potassium, Age, Sex)
    |
    v
[Optional: "Sharpen your prediction" -- expand to show Hemoglobin + Glucose]
    |
    v
[Optional: "Additional health info" -- expand for BP, SGLT2, Proteinuria, CKD type]
    |
    v
Submit --> Loading state (skeleton chart)
    |
    v
Results Screen: Chart + Stat Cards + Disclaimers + Confidence Badge
    |
    v
[Post-render prompt: "Save your results" --> Account creation via magic link]
    |
    v
[If account exists: "Add another lab test" --> multi-visit entry]
```

**Resolved:** No PDF download step. No placeholder buttons. Results screen ends with save prompt.

**Still open:** Should optional and silently-collected fields be on the same screen as required fields (progressive disclosure) or on a separate step (multi-step form)? I recommend progressive disclosure on a single screen to minimize friction for the 60+ audience.

### Decision 2: Data Entry UX for Lab Values -- UNCHANGED
- **Number inputs with explicit units** displayed next to the field (not inside placeholder text that disappears)
- **Validation ranges shown as helper text** below each field ("Normal range: 7-20 mg/dL") so patients can sanity-check their entry
- **No auto-advance between fields** -- let the user tab or tap at their own pace
- **Large, clearly labeled submit button** with disabled state until all required fields pass validation
- **Sex field (Decision #3):** Radio group (Male / Female / Prefer not to say) placed after Age, before optional field sections

### Decision 3: Chart Interaction Model -- UPDATED FOR VISX
Two variants to prepare:

**Variant A (Ideal -- full Visx customization):**
- Desktop: Hover over any trajectory line to see a tooltip with eGFR value at that time point. Click a stat card to highlight its corresponding line.
- Mobile: Tap a data point to see tooltip. Horizontal scroll if chart width exceeds viewport (with visual scroll affordance). Tap a stat card to highlight its line.
- True linear time axis with compressed first year. Annual tick marks. Footer note.
- Custom dash patterns per trajectory. Phase band background fills. End-of-line labels with collision avoidance.

**Variant B (Simplified fallback -- if Visx POC reveals constraints):**
- Desktop/Mobile: Static chart, no interactive tooltips. Data values shown in stat cards only.
- Simplified line styles (solid vs. dashed only, no short-dash).
- Phase bands as horizontal ruled sections (no gradient fills).
- Stat cards carry all the detailed numeric information.
- Both: The chart must be fully readable without any interaction -- tooltips are supplementary, not required for comprehension.

### ~~Decision 4: PDF Report Layout~~ REMOVED (Deferred to Phase 2b)

### Decision 5: Magic Link Authentication Flow -- APPROVED

1. User sees results as guest
2. Below results: "Save your results and track changes over time" prompt
3. User enters email address only
4. System sends magic link email
5. User clicks link --> account created, guest session data migrated (server-side, 24hr TTL window)
6. On return visits: "Sign in" --> enter email --> magic link --> authenticated

**Resolved:** No password fields. No bcrypt. No JWT login form. Magic link only (Decision #1). The Jira stories (SPEC-20, SPEC-59) referencing password-based auth are superseded by this decision.

### Decision 6: Guest Data Save Prompt (NEW -- from Decision #4)
After prediction results display, show a save prompt with clear messaging:
- **Headline:** "Save your results"
- **Body:** "Your results will be available for 24 hours. Create a free account to save them permanently and track changes over time."
- **CTA:** Email input + "Send me a sign-in link" button
- **Dismissible:** User can close and continue viewing results as guest

---

## 7. Design System Approach

### Component Library Strategy -- CONFIRMED: shadcn/ui + Tailwind
- Accessible by default (built on Radix UI primitives)
- Fully customizable -- design tokens map to Tailwind CSS variables
- Copy-paste model means no dependency bloat
- Strong Next.js 15 compatibility

### Design Tokens

**Color Palette (mapped to Tailwind CSS variables):**
| Token | Tailwind Variable | Value | Usage |
|-------|-------------------|-------|-------|
| `--color-primary` | `--primary` | #1D9E75 | CTA buttons, success states, BUN<=12 line |
| `--color-primary-light` | `--primary-light` | #E8F5F0 | Phase 2 band fill, success backgrounds |
| `--color-secondary` | `--secondary` | #378ADD | BUN 13-17 line, secondary actions |
| `--color-secondary-light` | `--secondary-light` | #85B7EB | BUN 18-24 line |
| `--color-neutral` | `--neutral` | #AAAAAA | No-treatment line, disabled states |
| `--color-danger` | `--destructive` | #D32F2F | Dialysis threshold line, error states |
| `--color-text-primary` | `--foreground` | #1A1A1A | Body text |
| `--color-text-secondary` | `--muted-foreground` | #666666 | Helper text, labels |
| `--color-text-muted` | `--muted-foreground` | #888888 | Phase band labels, tertiary text |
| `--color-background` | `--background` | #FFFFFF | Page background |
| `--color-surface` | `--card` | #F8F9FA | Card backgrounds, form sections |
| `--color-border` | `--border` | #E0E0E0 | Input borders, dividers |

**Typography Scale:**
| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-display` | 28px | 700 | Page title |
| `--text-heading` | 20px | 600 | Section headings |
| `--text-chart-title` | 15px | 700 | Chart title (per spec) |
| `--text-chart-subtitle` | 12px | 400 | Chart subtitle (per spec) |
| `--text-body` | 16px | 400 | Body text, form labels |
| `--text-body-large` | 18px | 400 | Stat card values |
| `--text-small` | 14px | 400 | Helper text, disclaimers |
| `--text-caption` | 12px | 400 | Chart axis labels, badges |

**Spacing Scale (8px base):**
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 24px
- `--space-6`: 32px
- `--space-7`: 48px
- `--space-8`: 64px

### Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column. Stat cards stack vertically. Chart at full width with horizontal scroll if needed. Sticky disclaimer footer. |
| Tablet | 768px -- 1024px | Two-column stat card grid (2x2). Chart at full width. Disclaimers below cards. |
| Desktop | > 1024px | Four-column stat card grid (as specced). Chart centered with max-width 960px. Disclaimers below cards. |

### Component Inventory (Updated Post-Meeting 1)

**Form Components:**
- `NumberInput` -- lab value entry with unit label, helper text, inline error (against approved error envelope)
- `RadioGroup` -- sex selection (Male / Female / Prefer not to say) -- CONFIRMED required, after Age
- `Toggle` -- SGLT2 inhibitor yes/no
- `Select` -- CKD diagnosis dropdown, proteinuria unit dropdown
- `SubmitButton` -- primary CTA with loading/disabled states
- `FormSection` -- collapsible group for optional/silent fields

**Chart Components (Visx-based, two variants):**
- `PredictionChart` -- main Visx chart container with true linear time axis
- `TrajectoryLine` -- individual Visx line with style props (solid, dashed, short-dash)
- `PhaseBand` -- Visx background fill region
- `DialysisThreshold` -- horizontal dashed red line
- `ChartTooltip` -- Visx hover/tap tooltip (Variant A only; omitted in Variant B)
- `ChartFootnote` -- required footer note about time intervals (Decision #5)
- `StatCard` -- individual result card with color border
- `StatCardGrid` -- responsive layout container
- `ConfidenceBadge` -- tier indicator
- `UnlockPrompt` -- CTA: "Add both your hemoglobin and glucose results to sharpen your prediction" (Decision #12)

**Auth Components (Magic Link -- Decision #1):**
- `MagicLinkPrompt` -- email entry + "Send me a sign-in link" button (no password field)
- `MagicLinkSent` -- "Check your email" confirmation with resend option
- `SavePrompt` -- post-prediction account creation nudge with 24hr TTL messaging (Decision #4)
- `AuthBanner` -- "Welcome back" / "Check your email" / "Link expired" states
- `SignInForm` -- email-only entry for returning users

**Layout Components:**
- `PageLayout` -- max-width container, responsive padding
- `DisclaimerBar` -- sticky footer on mobile (collapsed, expandable on tap), inline on desktop (Decision #11)
- `LoadingSkeleton` -- chart placeholder during API call

**Removed from MVP (Decision #2):**
- ~~`PdfDownloadButton`~~
- ~~`PdfLayout`~~
- ~~`EmailConfirmation` (Klaviyo trigger)~~

---

## 8. Accessibility Plan

### WCAG 2.1 AA Compliance Targets
- **1.1.1 Non-text Content:** Alt text for chart (summary of trajectory data for screen readers)
- **1.3.1 Info and Relationships:** Proper heading hierarchy, form labels associated with inputs
- **1.4.1 Use of Color:** Chart lines must be distinguishable by pattern (solid/dashed) in addition to color
- **1.4.3 Contrast (Minimum):** 4.5:1 for text, 3:1 for large text. Verify all chart colors against backgrounds.
- **1.4.4 Resize Text:** All text must remain readable at 200% zoom
- **2.1.1 Keyboard:** Full keyboard navigation for form, chart interaction, and save prompt
- **2.4.3 Focus Order:** Logical tab order through form fields, submit, results, save prompt
- **2.4.7 Focus Visible:** Clear focus indicators on all interactive elements
- **2.5.5 Target Size:** Minimum 44x44px for all interactive elements (critical for 60+ audience)
- **3.3.1 Error Identification:** Inline error messages linked to fields via aria-describedby, using approved error envelope
- **3.3.2 Labels or Instructions:** Every form field has a visible label and unit indicator
- **4.1.2 Name, Role, Value:** All custom components expose correct ARIA roles (shadcn/ui + Radix provides this baseline)

### Chart Accessibility (Visx-specific)
The eGFR trajectory chart is the most complex accessibility challenge. My plan:
- Provide a screen-reader-accessible data table as an alternative to the visual Visx SVG chart
- Use `aria-label` on the chart SVG with a text summary: "eGFR trajectory chart showing 4 scenarios over 10 years"
- Ensure line patterns (solid, dashed, short-dash) differentiate trajectories for color-blind users
- Verify all four line colors pass 3:1 contrast against the white background and phase band fills
- Visx renders SVG, which gives us direct control over ARIA attributes on chart elements

---

## 9. Meeting 1 Questions -- Resolution Status

| # | Question | Status |
|---|----------|--------|
| 1 | PDF scope: MVP or deferred? | **RESOLVED: Deferred to Phase 2b (Decision #2)** |
| 2 | Charting library selection? | **RESOLVED: Visx (Decision #6). Harshit building POC.** |
| 3 | Magic link vs. password? | **RESOLVED: Magic link only (Decision #1). Jira stories superseded.** |
| 4 | Sex field placement? | **RESOLVED: After Age, before optional fields (Decision #3). Radio: Male/Female/Prefer not to say.** |
| 5 | eGFR override field visibility? | Still open -- awaiting John Donaldson's input |
| 6 | Non-linear x-axis approach? | **RESOLVED: True linear time scale, compressed first year, footer note (Decision #5)** |
| 7 | Disclaimer mobile strategy? | **RESOLVED: Sticky footer, collapsed, expandable on tap (Decision #11). Husser confirming with legal.** |
| 8 | Silent fields -- progressive disclosure or separate step? | Still open -- I recommend progressive disclosure |
| 9 | Component framework? | **RESOLVED: shadcn/ui + Tailwind (Decision #7)** |
| 10 | Design tool for wireframes? | Still open -- producing as markdown specs for now |

---

## Post-Meeting Action Items

### Immediate (Parallel Drafting Phase)

1. **TWO chart spec variants for Visx** (Decision #6)
   - Variant A (Ideal): Full Visx customization -- custom dash patterns, phase band fills, interactive tooltips, true linear time axis with compressed first year, end-of-line labels with collision avoidance
   - Variant B (Simplified fallback): Static chart, solid/dashed lines only, no interactive tooltips, stat cards carry numeric detail
   - Both variants must include the chart footnote (Decision #5)
   - Deliverable: Detailed spec document for each variant

2. **Auth flow wireframes -- magic link** (Decision #1)
   - Guest results view with save prompt (24hr TTL messaging, Decision #4)
   - Email entry (no password field)
   - "Check your email" confirmation screen
   - Magic link landing (account created, data migrated)
   - Return user sign-in flow (email only)
   - Error states: expired link, invalid link, email not found

3. **Design tokens finalized for Tailwind mapping** (Decision #7)
   - Map all color tokens to Tailwind CSS variable naming conventions
   - Map typography scale to Tailwind text utilities
   - Map spacing scale to Tailwind spacing utilities
   - Document the mapping for Harshit's implementation
   - Verify all color combinations pass WCAG contrast requirements

### Blocked / Waiting

4. **Chart variant selection** -- blocked on Harshit's Visx POC results
5. **Inline validation designs** -- blocked on John Donaldson's finalized error envelope field names and validation ranges
6. **Legal confirmation on sticky disclaimer footer** -- blocked on Husser's legal review

### Ongoing

7. **Update unlock prompt copy** to reflect Decision #12: "Add both your hemoglobin and glucose results to sharpen your prediction"
8. **Remove all PDF references** from wireframes, flows, and component specs (Decision #2)
9. **Coordinate with Harshit** on Visx POC progress and shadcn/ui + Tailwind setup
