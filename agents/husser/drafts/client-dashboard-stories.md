# Client Dashboard — Jira Stories

**Author:** Husser (Product Manager)
**Date:** 2026-03-26
**Spec:** `/docs/superpowers/specs/2026-03-26-client-dashboard-design.md`
**Sprint:** Sprint 1

---

## Stories

### LKID-39: Client dashboard mockup and prototype design
**Type:** Story
**Sprint:** Sprint 1
**Owner:** Inga
**Labels:** agent:inga
**Points:** 3
**Description:** Create a hi-fi mockup and prototype of the client dashboard before Harshit builds it. Review the dashboard design spec at `docs/superpowers/specs/2026-03-26-client-dashboard-design.md` and translate it into a visual design. Define the layout grid, visual hierarchy, spacing, component placement, and responsive behavior at all three breakpoints. Use the Automation Architecture brand palette (teal, lime, cream). Produce a code-based prototype (same approach as the app prototype — Next.js page with real layout) that Harshit can reference during implementation. The mockup should cover all 7 dashboard sections: HeroBanner, WeeklyUpdate, PrototypePreview, SprintTracker, SpecTracker, DocumentLibrary, and Horizon. CTO sign-off required before Harshit begins scaffolding.

**Acceptance Criteria:**
- [ ] Design spec reviewed and annotated with visual design decisions
- [ ] Hi-fi mockup created showing all 7 dashboard sections
- [ ] Visual hierarchy defined: font sizes, weights, colors, spacing for each section
- [ ] Responsive behavior specified for mobile (<768px), tablet (768-1024px), desktop (>1024px)
- [ ] Brand palette correctly applied — teal headers, lime accents, cream background
- [ ] Prototype is viewable/clickable (code-based or equivalent)
- [ ] Design document saved to `agents/inga/drafts/client-dashboard-mockup.md`
- [ ] CTO sign-off obtained before handoff to Harshit
**Dependencies:** None

---

### LKID-40: Dashboard page scaffolding, isolated layout, and URL routing

**Type:** Story
**Sprint:** Sprint 1
**Owner:** Harshit
**Labels:** agent:harshit
**Points:** 3
**Description:** Create the client dashboard page at `/client/[slug]` in the LKID Next.js app. The page must use an isolated layout — no product header/footer. It gets its own minimal layout with the KidneyHood logo and "Project Dashboard" label. The slug is an unguessable token (e.g., `lee-a3f8b2`) that serves as lightweight auth — no login required. The page must be responsive (mobile, tablet, desktop) and use the Automation Architecture brand palette (teal `#004D43`, lime `#E6FF2B`, cream `#F9F7F2`). Vercel auto-deploys on push to main.
**Acceptance Criteria:**
- [ ] `/client/[slug]` route exists and renders the dashboard layout
- [ ] Layout is fully isolated from the product app (no shared header/footer)
- [ ] KidneyHood logo + "Project Dashboard" label in the dashboard header
- [ ] Cream (`#F9F7F2`) background, teal/lime accents per brand palette
- [ ] Responsive at mobile (<768px), tablet (768-1024px), and desktop (>1024px)
- [ ] Invalid slugs return a generic 404 (no information leakage)
- [ ] Page deploys automatically on Vercel when pushed to main
**Dependencies:** LKID-39 (Inga's mockup must be signed off before scaffolding begins)

---

### LKID-41: Core dashboard components — HeroBanner, SprintTracker, SpecTracker, DocumentLibrary, Horizon
**Type:** Story
**Sprint:** Sprint 1
**Owner:** Harshit
**Labels:** agent:harshit
**Points:** 5
**Description:** Build the five static content sections of the client dashboard. Each is a shadcn-based component using existing design tokens. **HeroBanner:** KidneyHood logo, "Project Dashboard" title, project timeline bar (Mar 30 - Apr 17) with a "You are here" date marker and sprint labels (Sprint 1 Design, Sprint 2 Core Flow, Sprint 3 Polish & QA). **SprintTracker:** Visual card grid showing Jira cards as small tiles with status colors — done (green), in progress (amber), upcoming (gray) — grouped by sprint. Reads from `app/client/data/sprint-progress.json`. **SpecTracker:** Table mapping Lee's calc spec items to implementation status. Columns: Spec Item, Jira Card, Status, Notes. Reads from `app/client/data/spec-tracker.json`. **DocumentLibrary:** Links to key artifacts (Lean Launch PRD, calc spec receipt, design sprint outputs, QA report) with one-line descriptions. **Horizon:** Sprint 2 and Sprint 3 previews with dates and focus areas, plus the ship date callout (April 17, 2026).
**Acceptance Criteria:**
- [ ] HeroBanner renders with timeline bar showing correct dates and "You are here" marker
- [ ] Sprint labels (1, 2, 3) appear under the timeline with names and date ranges
- [ ] SprintTracker renders card tiles from `sprint-progress.json` with correct status colors
- [ ] Cards grouped by sprint with visual separation
- [ ] SpecTracker renders table from `spec-tracker.json` with all four columns
- [ ] DocumentLibrary lists 4+ artifact links with descriptions
- [ ] Horizon section shows Sprint 2 and Sprint 3 previews with ship date
- [ ] All components are responsive and use shadcn Card, Badge, Button, Table
- [ ] Empty/missing JSON files degrade gracefully (no crash)
**Dependencies:** LKID-40 (page scaffolding)

---

### LKID-42: WeeklyUpdate component with markdown rendering pipeline
**Type:** Story
**Sprint:** Sprint 1
**Owner:** Harshit
**Labels:** agent:harshit
**Points:** 3
**Description:** Build the WeeklyUpdate section that renders authored markdown files as rich HTML. Updates are stored as markdown files with YAML frontmatter in `app/client/updates/` (e.g., `2026-03-26-week-1.md`). Each file contains a title, date, sprint number, highlights array in the frontmatter, followed by body content with two H2 sections: Husser's product update and John Donaldson's technical update. The component must parse frontmatter, render markdown to HTML, and display updates in reverse chronological order (newest on top). Each update shows the week header, highlights as a bulleted summary, and the two authored sections with author attribution.
**Acceptance Criteria:**
- [ ] Reads markdown files from `app/client/updates/` directory
- [ ] Parses YAML frontmatter (title, date, sprint, highlights)
- [ ] Renders markdown body to styled HTML (headings, paragraphs, lists, code blocks, bold/italic)
- [ ] Displays updates newest-first with timestamped headers (e.g., "Week 1 — March 26, 2026")
- [ ] Highlights from frontmatter rendered as a bulleted summary above the body
- [ ] Author attribution visible for each section (Product Update / Technical Update)
- [ ] No new dependencies beyond what Next.js and the repo already provide (use `gray-matter` + `remark` or similar lightweight libs)
- [ ] Graceful handling when no update files exist
**Dependencies:** LKID-40 (page scaffolding)

---

### LKID-43: Week 1 product update — authored content
**Type:** Story
**Sprint:** Sprint 1
**Owner:** Husser
**Labels:** agent:husser
**Points:** 2
**Description:** Write the Week 1 product update for the client dashboard. This is the "Product Update" section of the `2026-03-26-week-1.md` markdown file. The update is written from the product manager's perspective for Lee (the client/domain expert) and must be at least one full page. It should communicate what was accomplished in Sprint 1 and why it matters for the end product and Lee's vision.

**Content must cover:**

1. **Sprint 1 accomplishments in plain language.** Seven prototype screens were built and deployed to Vercel — Landing, Email Entry, Magic Link Sent, Expired Link, Prediction Form, Loading, and Results. These are real Next.js components with real routing, not static mockups. Lee can click through the full user journey today.

2. **QA pass results.** Yuri (QA) reviewed all five design sprint cards. Three passed clean, two passed with conditions. Seven issues were found (3 medium, 4 low) — all resolved in a follow-up commit. No hard blockers. The medium issues were: header accessibility label, form field validation ranges not matching spec, and PDF button being permanently disabled. All fixed.

3. **How the prototype reflects Lee's vision.** The four-input prediction form (BUN, creatinine, potassium, age) maps directly to Lee's calc spec. The results page is designed around the four-trajectory chart that is the core of the product. The magic link auth flow keeps things simple for the 60+ target demographic — deep-link buttons to Gmail/Outlook reduce friction.

4. **Calc spec acknowledgment.** Lee's server-side calculation specification was received and reviewed. Specific acknowledgments: eGFR threshold correction (12, not 15), potassium field removal from the rules engine noted, Section 3 rules engine mapping to LKID-14. Five items are pending Lee's clarification — these are queued for Sprint 2.

5. **Scope discipline.** The Lean Launch PRD cut the original 89 tickets down to ~25, reduced API endpoints from 12 to 5, database tables from 5 to 1 (plus Clerk), and frontend components from ~40 to 21. This is a lead generation tool, not a patient portal — every decision reinforces that focus.

6. **What's next.** Sprint 2 (Apr 6-10) builds the core flow: Clerk auth integration, database setup on Railway, the FastAPI prediction endpoint, the real chart with all four trajectory lines, and the form-to-chart pipeline end-to-end.

**Tone:** Narrative and accessible. Connect engineering work to patient outcomes and Lee's goals. Avoid jargon. Write as if Lee is reading this over coffee.

**Acceptance Criteria:**
- [ ] Content written as the Product Update section in `app/client/updates/2026-03-26-week-1.md`
- [ ] Frontmatter includes title, date (2026-03-26), sprint (1), and highlights array
- [ ] Minimum one full page of authored content (~500 words)
- [ ] Covers all six content areas listed above
- [ ] References specific Sprint 1 cards (LKID-31 through LKID-35) and their outcomes
- [ ] References the Lean Launch PRD scope decisions
- [ ] Acknowledges Lee's calc spec with specific section/item callouts
- [ ] Tone is narrative, accessible, and client-appropriate
- [ ] No placeholder text — every sentence is final copy
**Dependencies:** LKID-42 (markdown rendering pipeline must exist to display it)

---

### LKID-44: Week 1 technical update — authored content
**Type:** Story
**Sprint:** Sprint 1
**Owner:** John Donaldson
**Labels:** agent:john-donaldson
**Points:** 2
**Description:** Write the Week 1 technical update for the client dashboard. This is the "Technical Update" section appended to `app/client/updates/2026-03-26-week-1.md` (below Husser's product update). Written from the API designer's perspective for Lee. Minimum one full page. Should cover: the Next.js 15 + shadcn + Tailwind frontend stack and why it was chosen; the FastAPI + Railway + PostgreSQL backend architecture; how Lee's calc spec maps to the `/predict` endpoint design; Clerk magic-link auth and the webhook-to-leads-table pipeline; the Playwright PDF generation approach (exact SVG fidelity from the React chart); and technical tradeoffs made (Railway vs AWS, single leads table vs full schema, stateless PDF re-rendering vs cached results). Lee can handle Python pseudocode-level detail.
**Acceptance Criteria:**
- [ ] Content written as the Technical Update section in `app/client/updates/2026-03-26-week-1.md`
- [ ] Minimum one full page of authored content (~500 words)
- [ ] Covers frontend stack, backend architecture, spec-to-implementation mapping, auth flow, PDF approach, and tradeoffs
- [ ] References specific sections of Lee's calc spec where applicable
- [ ] Tone is technical but clear — no unexplained acronyms
- [ ] No placeholder text — every sentence is final copy
**Dependencies:** LKID-43 (shares the same markdown file; coordinate with Husser on file structure)

---

### LKID-45: Sprint progress JSON and spec tracker JSON population
**Type:** Story
**Sprint:** Sprint 1
**Owner:** Luca
**Labels:** agent:luca
**Points:** 1
**Description:** Create and populate the two JSON data files that drive the SprintTracker and SpecTracker dashboard components. **sprint-progress.json** maps every Jira card across all three sprints to a status (done, in_progress, upcoming). Sprint 1 cards (LKID-30 through LKID-38 plus the dashboard cards) should reflect current actual status. Sprint 2 and Sprint 3 cards should be listed as upcoming. **spec-tracker.json** maps Lee's calc spec sections to their corresponding Jira cards and implementation status. Include at minimum: Section 3 rules engine (LKID-14, unblocked), eGFR threshold correction, potassium removal, and the five pending items awaiting Lee's input.
**Acceptance Criteria:**
- [ ] `app/client/data/sprint-progress.json` exists and follows the schema from the design spec
- [ ] All Sprint 1 cards listed with accurate statuses
- [ ] Sprint 2 and Sprint 3 cards listed as upcoming
- [ ] `app/client/data/spec-tracker.json` exists and follows the schema from the design spec
- [ ] At least 5 spec items mapped to Jira cards with statuses and notes
- [ ] Corrections to Lee's spec are explicitly acknowledged (eGFR threshold, potassium removal)
- [ ] JSON is valid and parseable
**Dependencies:** None

---

### LKID-46: Visual design review and brand consistency check
**Type:** Story
**Sprint:** Sprint 1
**Owner:** Inga
**Labels:** agent:inga
**Points:** 1
**Description:** Review the deployed client dashboard for visual design quality and brand consistency. Verify the Automation Architecture brand palette is correctly applied (teal `#004D43`, lime `#E6FF2B`, cream `#F9F7F2`). Check typography (Inter font, correct weights), spacing (8px grid), component styling (shadcn Card, Badge, Button, Table), and responsive behavior at all three breakpoints. Confirm the dashboard feels professional and appropriate for a client-facing audience. Flag any inconsistencies with the product prototype's visual language. Deliver findings as a short review document in `agents/inga/drafts/`.
**Acceptance Criteria:**
- [ ] Brand palette verified: teal, lime, cream used correctly; no off-brand colors
- [ ] Typography check: Inter font loaded with correct weights, consistent sizing
- [ ] Spacing check: 8px grid adherence, consistent padding/margins
- [ ] Component styling: shadcn components used consistently, no unstyled elements
- [ ] Responsive review at mobile, tablet, and desktop breakpoints
- [ ] Review document written to `agents/inga/drafts/client-dashboard-review.md`
- [ ] Any issues flagged with screenshots or specific element references
**Dependencies:** LKID-40, LKID-41, LKID-42 (dashboard must be built before review)
