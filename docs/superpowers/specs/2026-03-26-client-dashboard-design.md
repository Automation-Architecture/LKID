# Client Dashboard — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Owner:** Husser (content), Harshit (implementation)
**Client:** Lee (domain expert + project stakeholder)

---

## Overview

A deployed client-facing progress dashboard for the KidneyHood project. Lee bookmarks the URL and checks back weekly. The page shows sprint progress, prototype access, document links, spec acknowledgment, and authored weekly summaries from two perspectives.

This is internal tooling that serves an external audience. It lives alongside the product but is isolated from the product UI.

---

## Page Structure & Access

- **URL:** `/client/lee-{short-hash}` route in the LKID Next.js app
- **Auth:** None — unguessable URL slug as lightweight security
- **Layout:** Isolated from main app. Own minimal layout with KidneyHood logo + "Project Dashboard" label. No product header/footer.
- **Tech:** Next.js page, shadcn components, existing design tokens. No new dependencies.
- **Responsive:** Yes — Lee may check on mobile.

---

## Content Sections (Top to Bottom)

### 1. Hero Banner

- KidneyHood logo + "Project Dashboard"
- Project timeline bar: `Mar 30 - Apr 17` with a "You are here" marker at current date
- Sprint labels underneath: Sprint 1 (Design), Sprint 2 (Core Flow), Sprint 3 (Polish & QA)

### 2. Weekly Update — Two Perspectives

Timestamped header (e.g., "Week 1 — March 26, 2026"). Newest week on top; older weeks stack below.

Each weekly update contains two authored summaries:

**Husser (Product Manager) — "Product Update"**

- One full page minimum, written from the product/user perspective
- What was built this week and why it matters for the end user
- How decisions tie back to Lee's vision (the calc spec, the patient journey)
- UX choices, user flow refinements, what Lee should look for in the prototype
- What's coming next from a product standpoint
- Tone: Narrative, accessible, connects engineering work to patient outcomes

**John Donaldson (API Designer) — "Technical Update"**

- One full page minimum, written from the technical/architecture perspective
- Engineering decisions made this week and the reasoning behind them
- How Lee's spec is being translated into implementation (specific sections referenced)
- Technical tradeoffs — what was considered and why
- Infrastructure and integration status
- Tone: Technical but clear — Lee can handle Python pseudocode-level detail

### 3. Live Prototype

- Prominent "View Prototype" button linking to the deployed Vercel preview
- 2-3 embedded screenshots of key screens (Landing, Predict Form, Results Chart)
- Caption: "Click through all 7 screens — real layout, real components, chart placeholder"

### 4. Sprint Progress Tracker

- Visual card grid: each Jira card shown as a small tile with status color
  - Done = green, In Progress = amber, Upcoming = gray
- Grouped by sprint: Sprint 1 (mostly green), Sprint 2 (gray), Sprint 3 (gray)
- Simple at-a-glance — not a burndown chart

### 5. Spec Acknowledgment Tracker

- Table mapping Lee's calc spec items to implementation status
- Columns: Spec Item | Jira Card | Status | Notes
- Example row: "Rules engine (Section 3)" | LKID-14 | "Unblocked — Sprint 2" | "Corrections to eGFR threshold (12, not 15) and potassium removal acknowledged"
- Trust-builder: Lee sees his work reflected back with specific acknowledgment

### 6. Document Library

Links to key artifacts Lee can review, each with a one-line description:

- Lean Launch MVP PRD
- Server-Side Calc Spec (confirming receipt)
- Design sprint outputs (user flows, wireframes, component specs)
- Yuri's QA report

### 7. Horizon — What's Coming

- Sprint 2 preview: "Core Flow (Apr 6-10)" — auth, DB, API, prediction engine, chart
- Sprint 3 preview: "Polish & QA (Apr 13-17)" — PDF export, disclaimers, accessibility, final QA
- Ship date callout: "Target launch: April 17, 2026"

---

## Data Model

Zero infrastructure overhead — all data is files in the repo. Vercel rebuilds on push.

### Weekly Updates

Stored as markdown files with frontmatter:

```
app/client/updates/
  2026-03-26-week-1.md
  2026-04-02-week-2.md
  ...
```

Frontmatter schema:

```yaml
---
title: "Week 1 — Design Sprint"
date: 2026-03-26
sprint: 1
highlights:
  - "7 prototype screens built and deployed"
  - "QA pass complete — 7 issues found, all resolved"
  - "Server-side calc spec received and acknowledged"
---
```

Body contains Husser's product update followed by Donaldson's technical update, each under an H2 with author attribution.

### Sprint Progress

```
app/client/data/sprint-progress.json
```

Maps each Jira card to a status. Updated by the team as cards move. Schema:

```json
{
  "sprints": [
    {
      "name": "Sprint 1 — Design",
      "dates": "Mar 30 - Apr 3",
      "cards": [
        { "id": "LKID-31", "title": "Revise user flows", "status": "done" },
        { "id": "LKID-36", "title": "Form validation + MSW", "status": "in_progress" }
      ]
    }
  ]
}
```

### Spec Tracker

```
app/client/data/spec-tracker.json
```

Maps Lee's spec items to Jira cards and statuses. Updated by John Donaldson or Luca.

```json
{
  "items": [
    {
      "spec_section": "Section 3 — Rules Engine",
      "jira_card": "LKID-14",
      "status": "unblocked",
      "notes": "Corrections acknowledged: eGFR 12 threshold, potassium removed"
    }
  ]
}
```

---

## Visual Design

- Automation Architecture brand palette (teal `#004D43`, lime `#E6FF2B`, cream `#F9F7F2`)
- Same shadcn components as the product: Card, Badge, Button, Table
- Responsive layout — mobile-friendly
- Clean, professional, minimal — working dashboard, not a marketing page

---

## Excalidraw Diagrams

Two Excalidraw diagrams accompany this page:

1. **Progress map** — visual overview of what's been done, what's in progress, what's ahead (embedded in hero or as a standalone section)
2. **Architecture overview** — system diagram showing the tech stack and how components connect (embedded in the technical update or document library)

Both use the Automation Architecture brand palette.

---

## Deployment

- Lives in the LKID Next.js app on Vercel
- Auto-deploys on push to main
- No separate build pipeline needed
- URL is shareable — Lee bookmarks it

---

## Sprint Integration

This is a sprint task for the team:

- **Harshit** scaffolds the page, components, and layout
- **Husser** writes the first weekly product update
- **John Donaldson** writes the first weekly technical update
- **Luca** populates the spec tracker and sprint progress JSON
- **Inga** reviews visual design for brand consistency

Estimated: 1 card in Sprint 2 backlog (LKID-XX — Client Dashboard).

---

## Reusable Skill: `/create-app-dashboard`

This design becomes a reusable skill. The skill:

1. **Detects environment** — existing Next.js app? Integrate. No app? Scaffold standalone.
2. **Detects agent team** — if `agents/` folder or team roster exists, ask the user: "Who should own this work? Should I add it to the existing backlog?"
3. **Gathers inputs** — client name, project name, sprint structure, tech stack, brand colors (or defaults)
4. **Scaffolds the dashboard** — page, components, data files, update templates
5. **Assigns work** (if agent team) — creates Jira card or backlog item, assigns to named agents

### Future Enhancements (Approach C Upgrade Path)

- Live PR/build status via GitHub API
- Sprint burndown chart
- Automated spec acknowledgment tracking
- Multi-client support with per-client URL slugs
- Notification system (email or Slack) when updates are posted
