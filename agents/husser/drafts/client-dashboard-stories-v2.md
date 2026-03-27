# Client Dashboard — Implementation-Ready Stories (v2)

**Author:** Husser (Product Manager)
**Date:** 2026-03-26
**Spec:** `docs/superpowers/specs/2026-03-26-client-dashboard-design.md`
**Mockup:** `agents/inga/drafts/client-dashboard-mockup.md`
**Component Interfaces:** `~/.claude/skills/create-app-dashboard/references/component-specs.md`
**Data Schemas:** `~/.claude/skills/create-app-dashboard/references/data-schemas.md`
**Sprint:** Sprint 1

---

## Quick Start for Harshit

### Branch

```bash
cd /tmp/lkid-work
git checkout -b feat/LKID-39-client-dashboard
```

### Working Directory

All dashboard code lives under the LKID Next.js app:

```
app/src/app/client/            # Route: /client/[slug]
app/src/app/client/[slug]/     # Dynamic route page
app/src/components/dashboard/  # All 7 dashboard components
app/src/app/client/data/       # JSON data files (sprint-progress, spec-tracker, documents)
app/src/app/client/updates/    # Markdown weekly updates
app/src/lib/markdown.ts        # Markdown parsing utilities
```

### Packages to Install

```bash
cd /tmp/lkid-work/app
npm install gray-matter remark remark-html
npm install -D @types/remark @types/remark-html
```

These are needed for LKID-42 (WeeklyUpdate markdown pipeline). The rest of the dashboard uses only what is already in `package.json`: `lucide-react`, `shadcn` (Card, Badge, Button), `tailwind-merge`, `clsx`.

**Missing shadcn components** — the app currently has `button`, `card`, `input`, `label`. You need to add `badge` and `table`:

```bash
npx shadcn@latest add badge table
```

### Local Dev

```bash
cd /tmp/lkid-work/app
npm run dev
# Visit http://localhost:3000/client/lee-a3f8b2
```

### Implementation Order

```
LKID-40 (scaffold)
   |
   +---> LKID-41 (5 static components) ----+
   |                                        |---> LKID-46 (Inga review)
   +---> LKID-42 (WeeklyUpdate pipeline) --+
              |
              +---> LKID-43 (Husser content) --+--> can merge
              +---> LKID-44 (JD content) ------+

LKID-45 (JSON data) — no code dependency, can start immediately in parallel with LKID-40
```

**Parallelizable:** LKID-41 and LKID-42 can be built simultaneously after LKID-40. LKID-45 has zero code dependencies and can be done by Luca at any time.

**Sequential:** LKID-43 and LKID-44 require LKID-42 to be merged first (the rendering pipeline must exist). LKID-46 requires LKID-40 + LKID-41 + LKID-42 to all be complete.

---

## Stories

---

### LKID-39: Client dashboard mockup and prototype design

**Type:** Story | **Points:** 3 | **Owner:** Inga | **Labels:** `agent:inga`

**Description:** Create a hi-fi mockup and prototype of the client dashboard before Harshit builds it. Review the dashboard design spec at `docs/superpowers/specs/2026-03-26-client-dashboard-design.md` and translate it into a visual design. Define the layout grid, visual hierarchy, spacing, component placement, and responsive behavior at all three breakpoints. Use the Automation Architecture brand palette (teal, lime, cream). Produce a code-based prototype (same approach as the app prototype — Next.js page with real layout) that Harshit can reference during implementation. The mockup should cover all 7 dashboard sections: HeroBanner, WeeklyUpdate, PrototypePreview, SprintTracker, SpecTracker, DocumentLibrary, and Horizon. CTO sign-off required before Harshit begins scaffolding.

**Status:** COMPLETE. Output saved to `agents/inga/drafts/client-dashboard-mockup.md`.

**Acceptance Criteria:**
- [x] Design spec reviewed and annotated with visual design decisions
- [x] Hi-fi mockup created showing all 7 dashboard sections
- [x] Visual hierarchy defined: font sizes, weights, colors, spacing for each section
- [x] Responsive behavior specified for mobile (<768px), tablet (768-1024px), desktop (>1024px)
- [x] Brand palette correctly applied — teal headers, lime accents, cream background
- [x] Prototype is viewable/clickable (code-based or equivalent)
- [x] Design document saved to `agents/inga/drafts/client-dashboard-mockup.md`
- [ ] CTO sign-off obtained before handoff to Harshit

**Dependencies:** None

---

### LKID-40: Dashboard page scaffolding, isolated layout, and URL routing

**Type:** Story | **Points:** 3 | **Owner:** Harshit | **Labels:** `agent:harshit`

**Description:** Create the client dashboard page at `/client/[slug]` in the LKID Next.js app. The page must use an isolated layout — no product header/footer. It gets its own minimal layout with the KidneyHood logo and "Project Dashboard" label. The slug is an unguessable token (e.g., `lee-a3f8b2`) that serves as lightweight auth — no login required. The page must be responsive (mobile, tablet, desktop) and use the Automation Architecture brand palette.

#### Technical Implementation Notes

**Files to create:**

| File | Purpose |
|------|---------|
| `app/src/app/client/[slug]/layout.tsx` | Isolated layout — does NOT inherit product header/footer. Wraps children in `<main>` with cream background. |
| `app/src/app/client/[slug]/page.tsx` | Dashboard page — imports and renders all 7 sections in order. Reads JSON data and passes as props. |
| `app/src/app/client/[slug]/not-found.tsx` | Custom 404 — generic "Page not found" with no information leakage about valid slugs. |
| `app/src/components/dashboard/DashboardHeader.tsx` | Minimal header: logo + "Project Dashboard" label. |
| `app/src/components/dashboard/DashboardFooter.tsx` | Footer: "Powered by Automation Architecture" + last updated date. |

**How isolated layout works in Next.js 15:**

The root layout at `app/src/app/layout.tsx` applies the Inter font and `<SkipNav>`. That is fine — it does not include the product header/footer (those are in the product pages directly). The `client/[slug]/layout.tsx` adds the dashboard-specific header, footer, and cream background. No changes to the root layout are needed.

**Slug validation:**

In `page.tsx`, validate the slug against a hardcoded allowlist for now:

```typescript
const VALID_SLUGS = ['lee-a3f8b2'];

export default async function ClientDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!VALID_SLUGS.includes(slug)) {
    notFound();
  }
  // ... render dashboard sections
}
```

**Imports needed:**

```typescript
// layout.tsx
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardFooter } from '@/components/dashboard/DashboardFooter';

// page.tsx
import { notFound } from 'next/navigation';
import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { WeeklyUpdate } from '@/components/dashboard/WeeklyUpdate';
import { PrototypePreview } from '@/components/dashboard/PrototypePreview';
import { SprintTracker } from '@/components/dashboard/SprintTracker';
import { SpecTracker } from '@/components/dashboard/SpecTracker';
import { DocumentLibrary } from '@/components/dashboard/DocumentLibrary';
import { Horizon } from '@/components/dashboard/Horizon';
```

**Mockup reference:** `agents/inga/drafts/client-dashboard-mockup.md` — Sections 1 (Layout Grid), 2 (Design Tokens), 5 (Page Footer), 6 (Interaction States), 7 (Spacing Quick Reference).

#### Data Contract

No JSON data for this story. The page scaffolding imports components and passes props. The `page.tsx` will read from JSON files and markdown in later stories — for now, render placeholder components that accept the correct prop shapes but display "Loading..." or empty states.

#### Acceptance Criteria (Sharpened)

- [ ] Visiting `/client/lee-a3f8b2` renders the dashboard page with cream (`#F9F7F2`) background
- [ ] Visiting `/client/invalid-slug` returns a 404 page with no mention of valid slugs
- [ ] Dashboard header displays "KidneyHood" text (or logo) at 24px/700 weight in `#004D43`, plus "Project Dashboard" at 14px/500 in `#636363`, separated by 12px gap — per mockup Section 4.1
- [ ] Footer displays "Powered by Automation Architecture" centered, 12px/400 in `#898A8D`, with a 1px `#D8D8D8` top border and 64px top margin — per mockup Section 5
- [ ] Container is max-width 1024px, centered, with 24px horizontal padding on mobile, 32px on tablet, 0 on desktop — per mockup Section 1
- [ ] Page uses the Inter font (already loaded in root layout via `--font-sans` CSS variable)
- [ ] No product header or footer appears on the dashboard page
- [ ] `npm run build` completes without errors
- [ ] Page is accessible: `<main>` wraps content, `<footer>` wraps footer, heading hierarchy is correct

**Dependencies:** LKID-39 (Inga's mockup must be signed off before scaffolding begins)

---

### LKID-41: Core dashboard components — HeroBanner, SprintTracker, SpecTracker, DocumentLibrary, Horizon

**Type:** Story | **Points:** 5 | **Owner:** Harshit | **Labels:** `agent:harshit`

**Description:** Build the five static/data-driven sections of the client dashboard. Each is a separate file in `app/src/components/dashboard/`.

#### Technical Implementation Notes

**Files to create:**

| File | Component | shadcn Deps |
|------|-----------|-------------|
| `app/src/components/dashboard/HeroBanner.tsx` | HeroBanner | None (custom HTML) |
| `app/src/components/dashboard/SprintTracker.tsx` | SprintTracker | `Card`, `Badge` |
| `app/src/components/dashboard/SpecTracker.tsx` | SpecTracker | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `Badge` |
| `app/src/components/dashboard/DocumentLibrary.tsx` | DocumentLibrary | `Card`, `CardContent`, `Badge` |
| `app/src/components/dashboard/Horizon.tsx` | Horizon | `Card`, `CardHeader`, `CardContent` |

**Lucide icons needed** (already in `package.json` as `lucide-react`):

```typescript
import {
  CheckCircle2,
  ArrowRightCircle,
  XCircle,
  FileText,
  FileCode,
  Table as TableIcon,
  ExternalLink,
} from 'lucide-react';
```

#### Mockup References (per component)

| Component | Mockup Section | Key Visual Details |
|-----------|---------------|-------------------|
| HeroBanner | Section 4.1 | Timeline bar 8px height, `#E5E7EB` track, teal fill for completed sprints, lime 12px circle "You are here" marker with 2px teal border, sprint labels in flex row |
| SprintTracker | Section 4.4 | Tiles in flex-wrap grid, 4/row desktop, 3 tablet, 2 mobile. Tile padding 16px, border-radius 10px. Status colors per table in Section 4.4. Card ID 12px/600, title 14px/400 with 2-line clamp. |
| SpecTracker | Section 4.5 | Teal `#004D43` header row with white uppercase text. Alternating row bg `#FFFFFF`/`#FAFAFA`. Badge pill shape (9999px radius). Sticky first column on mobile with right shadow. Min table width 600px. |
| DocumentLibrary | Section 4.6 | Row cards with 10px radius, 16px 20px padding. 32px icon container with `#F3F4F6` bg. Hover: border `#898A8D`, bg `#FAFAFA`. "New" badge: lime bg, teal text, pill shape. |
| Horizon | Section 4.7 | 2-column grid for sprint cards. Ship date callout: teal `#004D43` bg, 12px radius, lime 4px accent bar on left side. "Target launch: April 9, 2026" in 18px/700 white. |

#### Data Contracts

**HeroBanner** — props (hardcoded in `page.tsx`, not from JSON):

```typescript
interface HeroBannerProps {
  projectName: string       // "KidneyHood"
  startDate: string         // "2026-03-20"
  endDate: string           // "2026-04-09"
  sprints: Array<{
    name: string            // "Sprint 1 — Design"
    startDate: string       // "2026-03-20"
    endDate: string         // "2026-03-26"
  }>
}

// Example usage in page.tsx:
<HeroBanner
  projectName="KidneyHood"
  startDate="2026-03-20"
  endDate="2026-04-09"
  sprints={[
    { name: "Sprint 1 — Design", startDate: "2026-03-20", endDate: "2026-03-26" },
    { name: "Sprint 2 — Core Flow", startDate: "2026-03-26", endDate: "2026-04-02" },
    { name: "Sprint 3 — Polish & QA", startDate: "2026-04-02", endDate: "2026-04-09" },
  ]}
/>
```

**SprintTracker** — reads from `app/src/app/client/data/sprint-progress.json`:

```json
{
  "sprints": [
    {
      "name": "Sprint 1 — Design",
      "dates": "Mar 20 - Mar 26",
      "cards": [
        { "id": "LKID-31", "title": "Revise user flows", "status": "done" },
        { "id": "LKID-32", "title": "Revise wireframes", "status": "done" },
        { "id": "LKID-33", "title": "Revise component specs", "status": "done" },
        { "id": "LKID-34", "title": "Scaffold prototype", "status": "done" },
        { "id": "LKID-35", "title": "Build prototype screens", "status": "done" },
        { "id": "LKID-36", "title": "Form validation + MSW", "status": "in_progress" },
        { "id": "LKID-37", "title": "Accessibility baseline", "status": "in_progress" },
        { "id": "LKID-38", "title": "Design sign-off", "status": "upcoming" }
      ]
    },
    {
      "name": "Sprint 2 — Core Flow",
      "dates": "Mar 26 - Apr 2",
      "cards": [
        { "id": "LKID-1", "title": "Clerk auth integration", "status": "upcoming" },
        { "id": "LKID-2", "title": "Database setup (Railway)", "status": "upcoming" },
        { "id": "LKID-3", "title": "FastAPI predict endpoint", "status": "upcoming" }
      ]
    },
    {
      "name": "Sprint 3 — Polish & QA",
      "dates": "Apr 2 - Apr 9",
      "cards": [
        { "id": "LKID-4", "title": "PDF export", "status": "upcoming" },
        { "id": "LKID-5", "title": "Disclaimers & legal", "status": "upcoming" }
      ]
    }
  ]
}
```

Valid statuses: `done` | `in_progress` | `upcoming` | `blocked`

**SpecTracker** — reads from `app/src/app/client/data/spec-tracker.json`:

```json
{
  "items": [
    {
      "spec_section": "Section 3 — Rules Engine",
      "jira_card": "LKID-14",
      "status": "unblocked",
      "notes": "Corrections acknowledged: eGFR 12 threshold, potassium removed"
    },
    {
      "spec_section": "eGFR Threshold Correction",
      "jira_card": "LKID-14",
      "status": "done",
      "notes": "Updated from 15 to 12 per Lee's spec"
    },
    {
      "spec_section": "Potassium Field Removal",
      "jira_card": "LKID-14",
      "status": "done",
      "notes": "Removed from rules engine input per Lee's instruction"
    },
    {
      "spec_section": "Four-Input Prediction Form",
      "jira_card": "LKID-12",
      "status": "in_progress",
      "notes": "BUN, creatinine, potassium, age — form built in prototype"
    },
    {
      "spec_section": "Trajectory Chart (4 lines)",
      "jira_card": "LKID-18",
      "status": "upcoming",
      "notes": "Chart placeholder in prototype; real implementation Sprint 2"
    }
  ]
}
```

Valid statuses: `done` | `in_progress` | `unblocked` | `blocked`

**DocumentLibrary** — hardcode in `page.tsx` or read from `app/src/app/client/data/documents.json`:

```json
{
  "documents": [
    {
      "name": "Lean Launch MVP PRD",
      "url": "/artifacts/lean-launch-mvp-prd.md",
      "description": "Binding scope document — approved March 25, 2026",
      "type": "markdown",
      "isNew": false
    },
    {
      "name": "Server-Side Calc Spec",
      "url": "#",
      "description": "Lee's calculation specification — received and acknowledged",
      "type": "pdf",
      "isNew": true
    },
    {
      "name": "Design Sprint Outputs",
      "url": "/docs/design-sprint/",
      "description": "User flows, wireframes, component specs, prototype",
      "type": "external",
      "isNew": true
    },
    {
      "name": "QA Report — Design Sprint",
      "url": "/agents/yuri/drafts/design-sprint-qa-report.md",
      "description": "7 issues found, all resolved — 3 medium, 4 low",
      "type": "markdown",
      "isNew": true
    }
  ]
}
```

Valid types: `pdf` | `markdown` | `spreadsheet` | `external`

**Horizon** — hardcode in `page.tsx`:

```typescript
interface HorizonProps {
  upcomingSprints: Array<{
    name: string
    dates: string
    deliverables: string[]
    status: 'up_next' | 'planned'
  }>
  shipDate?: string
}

// Example usage:
<Horizon
  upcomingSprints={[
    {
      name: "Sprint 2 — Core Flow",
      dates: "Mar 26 - Apr 2",
      status: "up_next",
      deliverables: [
        "Clerk magic-link auth integration",
        "PostgreSQL database on Railway",
        "FastAPI /predict endpoint",
        "Real eGFR trajectory chart (4 lines)",
        "Form-to-chart pipeline end-to-end",
      ],
    },
    {
      name: "Sprint 3 — Polish & QA",
      dates: "Apr 2 - Apr 9",
      status: "planned",
      deliverables: [
        "PDF export with Playwright (SVG fidelity)",
        "Legal disclaimers and consent",
        "Accessibility audit (WCAG AA)",
        "End-to-end test suite",
        "Final QA gate and launch prep",
      ],
    },
  ]}
  shipDate="April 9, 2026"
/>
```

#### Acceptance Criteria (Sharpened)

**HeroBanner:**
- [ ] Timeline bar renders at 8px height with `#E5E7EB` track color and 4px border-radius
- [ ] Completed sprint segments fill with `#004D43` (teal); current sprint fills with `#004D43` at 40% opacity
- [ ] "You are here" marker is a 12px lime (`#E6FF2B`) circle with 2px `#004D43` border, positioned at the correct percentage of project duration based on the current date
- [ ] Below the marker: a 2px-wide, 16px-tall vertical line in `#004D43`, then "You are here" text in 12px/500/`#636363`
- [ ] Sprint labels appear in a flex row with `justify-content: space-between`; each shows name (14px/600/`#010101`) and dates (12px/400/`#636363`)
- [ ] On mobile (<768px): timeline bar is replaced by a vertical list with 8px status dots and lime left-border on current sprint — per mockup Section 4.1 "Responsive (mobile)"

**SprintTracker:**
- [ ] Each sprint group has a header with sprint name (18px/600/`#010101`) and "X of Y complete" summary (14px/400/`#636363`)
- [ ] Tiles are flex-wrap: 4 per row on desktop (`calc((100% - 36px) / 4)`), 3 on tablet, 2 on mobile
- [ ] Each tile has 16px padding, 10px border-radius, and background/border colors per status: Done `#DCFCE7`/`#BBF7D0`, In Progress `#FEF3C7`/`#FDE68A`, Upcoming `#F3F4F6`/`#E5E7EB`, Blocked `#FEE2E2`/`#FECACA`
- [ ] Card ID renders at 12px/600 in the status text color; title at 14px/400/`#010101` with 2-line clamp
- [ ] Status icons (CheckCircle2, ArrowRightCircle, XCircle from lucide-react) positioned top-right, 8px from edges, 16px size

**SpecTracker:**
- [ ] Table header row has `#004D43` background with 12px/600 uppercase white text with 0.5px letter-spacing
- [ ] Column widths: Spec Item 35%, Card 15%, Status 15%, Notes 35%
- [ ] Body rows alternate `#FFFFFF` and `#FAFAFA` backgrounds; row padding 14px 16px; border-bottom 1px `#E8E8E8`
- [ ] Status badges are pill-shaped (border-radius 9999px) with 4px 12px padding, 12px/600 font, colors per status table in mockup Section 4.5
- [ ] Card column text is 14px/500/`#004D43`, underline on hover
- [ ] Notes column has 2-line clamp with `title` attribute for full text tooltip
- [ ] On mobile: table wrapper has `overflow-x: auto`; first column is `position: sticky, left: 0` with right box-shadow `2px 0 4px rgba(0,0,0,0.05)`; min table width 600px
- [ ] Section header shows "Spec Acknowledgment" (24px/700/`#004D43`) with "X of Y spec items addressed" subtext

**DocumentLibrary:**
- [ ] Each document row is a card with `#FFFFFF` bg, 1px `#D8D8D8` border, 10px radius, 16px 20px padding
- [ ] Icon container: 32px square, `#F3F4F6` bg, 8px radius, 16px icon in `#636363`
- [ ] Icon mapping: pdf=FileText, markdown=FileCode, spreadsheet=TableIcon, external=ExternalLink
- [ ] Document name: 16px/500/`#010101`; description: 14px/400/`#636363`
- [ ] "New" badge: `#E6FF2B` bg, `#004D43` text, 12px/600, pill shape, only when `isNew: true`
- [ ] Hover state: border transitions to `#898A8D`, bg to `#FAFAFA`, cursor pointer

**Horizon:**
- [ ] Sprint preview cards in 2-column grid with 16px gap; each card `#FFFFFF` bg, 1px `#D8D8D8` border, 12px radius, 24px padding
- [ ] Sprint name 18px/600/`#010101`; dates 14px/400/`#636363`; status badge top-right ("Up Next" amber, "Planned" gray)
- [ ] Deliverables as unordered list with 6px `#004D43` dot bullets, 14px/400/`#010101` text, 8px gap between items
- [ ] Ship date callout: full-width, `#004D43` bg, 12px radius, 24px 32px padding, "Target launch: April 9, 2026" in 18px/700/`#FFFFFF`, with 4px-wide 32px-tall lime (`#E6FF2B`) accent bar on the left
- [ ] On mobile: sprint cards stack to 1 column; ship date padding reduces to 20px 24px, text to 16px

**All components:**
- [ ] Graceful degradation: if JSON files are missing or empty, components render an empty state (no crash, no error boundary triggered)
- [ ] All sections separated by 64px vertical gap (no visible dividers)
- [ ] `npm run build` completes without errors

**Dependencies:** LKID-40 (page scaffolding)

---

### LKID-42: WeeklyUpdate component with markdown rendering pipeline

**Type:** Story | **Points:** 3 | **Owner:** Harshit | **Labels:** `agent:harshit`

**Description:** Build the WeeklyUpdate section that renders authored markdown files as rich HTML. Updates are stored as markdown files with YAML frontmatter in `app/src/app/client/updates/`.

#### Technical Implementation Notes

**Files to create:**

| File | Purpose |
|------|---------|
| `app/src/lib/markdown.ts` | Utility: `getWeeklyUpdates()` reads all `.md` files from `client/updates/`, parses frontmatter with `gray-matter`, converts body to HTML with `remark` + `remark-html`, returns array sorted by date descending. |
| `app/src/components/dashboard/WeeklyUpdate.tsx` | Renders a single week's update card. |
| `app/src/components/dashboard/WeeklyUpdateList.tsx` | Renders the list of all updates (newest first), with "Show earlier updates" button after 3. |

**Markdown utility signature:**

```typescript
// app/src/lib/markdown.ts
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import fs from 'fs';
import path from 'path';

interface WeeklyUpdateData {
  title: string;
  date: string;
  sprint: number;
  highlights: string[];
  contentHtml: string;
}

export async function getWeeklyUpdates(): Promise<WeeklyUpdateData[]> {
  const updatesDir = path.join(process.cwd(), 'src/app/client/updates');
  // Read all .md files, parse frontmatter, convert to HTML
  // Sort by date descending (newest first)
  // Return array
}
```

**Important:** This runs server-side only (Next.js `page.tsx` is a Server Component by default). The `fs` and `path` imports are fine — they will not be bundled into the client.

**Mockup reference:** `agents/inga/drafts/client-dashboard-mockup.md` — Section 4.2 (WeeklyUpdate).

#### Data Contract

**Input:** Markdown files in `app/src/app/client/updates/` with this frontmatter schema:

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

Body contains two H2 sections:

```markdown
## Product Update — Husser

[prose content]

## Technical Update — John Donaldson

[prose content]
```

**Output to component (after parsing):**

```typescript
interface WeeklyUpdateProps {
  title: string           // "Week 1 — Design Sprint"
  date: string            // "2026-03-26"
  sprint: number          // 1
  highlights: string[]    // ["7 prototype screens...", "QA pass...", "Calc spec..."]
  contentHtml: string     // Full HTML string with both H2 sections
}
```

#### Acceptance Criteria (Sharpened)

- [ ] `getWeeklyUpdates()` reads all `.md` files from `app/src/app/client/updates/`, returns them sorted by date descending
- [ ] YAML frontmatter is correctly parsed: `title`, `date`, `sprint`, `highlights` all extracted
- [ ] Markdown body converts to HTML: headings, paragraphs, lists, code blocks, bold, italic all render correctly
- [ ] Each week renders in a white (`#FFFFFF`) Card with 1px `#D8D8D8` border, 12px radius, 32px padding (20px on mobile)
- [ ] Week header: "Week N -- Month DD, YYYY" in 24px/700/`#004D43` (20px on mobile)
- [ ] Sprint badge next to header: shadcn Badge with `outline` variant, "Sprint N" text, 12px/500, border `#004D43`, text `#004D43`
- [ ] Highlights render as a bulleted list with CheckCircle2 icons (16px, `#166534`), each item 16px/400/`#010101`, 8px gap between items
- [ ] Product Update section: "Product Update" heading at 18px/600/`#010101`, author line "Husser, Product Manager" at 14px/400/`#636363` with 24px avatar circle placeholder (initials "H")
- [ ] Technical Update section: separated by 1px `#E8E8E8` divider with 28px margin above and below, same heading/author pattern (initials "JD")
- [ ] Code blocks render with `#F3F4F6` background, 8px radius, 16px padding, 14px monospace font
- [ ] Between markdown paragraphs: 16px margin
- [ ] If more than 3 week cards exist, only first 3 show; a "Show earlier updates" button (14px/600/`#004D43`, no border, underline on hover) reveals the rest
- [ ] If no `.md` files exist in the updates directory, the section renders nothing (no error)
- [ ] On mobile: avatar circles hidden, sprint badge wraps below header

**Dependencies:** LKID-40 (page scaffolding)

---

### LKID-43: Week 1 product update — authored content

**Type:** Story | **Points:** 2 | **Owner:** Husser | **Labels:** `agent:husser`

**Description:** Write the Week 1 product update for the client dashboard. This is the "Product Update" section of the `2026-03-26-week-1.md` markdown file.

#### Technical Implementation Notes

**File to create:** `app/src/app/client/updates/2026-03-26-week-1.md`

This file is shared with LKID-44. Husser creates the file with frontmatter and the Product Update section. John Donaldson appends the Technical Update section below.

**File structure:**

```markdown
---
title: "Week 1 — Design Sprint"
date: 2026-03-26
sprint: 1
highlights:
  - "7 prototype screens built and deployed to Vercel"
  - "QA pass complete — 7 issues found, all resolved"
  - "Server-side calc spec received and acknowledged"
  - "Scope reduced from 89 tickets to ~25 via Lean Launch PRD"
---

## Product Update — Husser

[Husser's authored content goes here — minimum 500 words]

## Technical Update — John Donaldson

[John Donaldson's authored content goes here — LKID-44]
```

**Mockup reference:** `agents/inga/drafts/client-dashboard-mockup.md` — Section 4.2 (WeeklyUpdate) defines how this content will render. The markdown H2/H3 headings, paragraphs, lists, and bold text will all be styled per the mockup's typography scale.

#### Content Requirements

The update is written from the product manager's perspective for Lee (the client) and must cover all six areas:

1. Sprint 1 accomplishments in plain language (7 screens, real Next.js routing, click-through journey)
2. QA pass results (3 passed clean, 2 with conditions, 7 issues all resolved — 3 medium, 4 low)
3. How the prototype reflects Lee's vision (4-input form, trajectory chart, magic link auth for 60+ demographic)
4. Calc spec acknowledgment (eGFR threshold 12 not 15, potassium removal, Section 3 rules engine LKID-14, 5 items pending)
5. Scope discipline (89 tickets to ~25, 12 endpoints to 5, 5 DB tables to 1, ~40 components to 21)
6. What's next (Sprint 2: auth, DB, API, chart, form pipeline)

**Tone:** Narrative and accessible. As if Lee is reading over coffee.

#### Acceptance Criteria (Sharpened)

- [ ] File exists at `app/src/app/client/updates/2026-03-26-week-1.md`
- [ ] Frontmatter contains `title: "Week 1 — Design Sprint"`, `date: 2026-03-26`, `sprint: 1`, and a `highlights` array with 3-5 items
- [ ] Content appears under the `## Product Update — Husser` heading
- [ ] Minimum 500 words of authored content (no placeholder text)
- [ ] References specific Sprint 1 cards: LKID-31, LKID-32, LKID-33, LKID-34, LKID-35 by ID and outcome
- [ ] References the Lean Launch PRD scope decisions with specific numbers (89 to ~25, 12 to 5, etc.)
- [ ] Acknowledges Lee's calc spec: eGFR threshold correction (12, not 15), potassium removal, Section 3 rules engine (LKID-14), five pending items
- [ ] Tone is narrative, accessible, and client-appropriate — no unexplained jargon
- [ ] The `## Technical Update — John Donaldson` heading exists as a placeholder for LKID-44
- [ ] Content renders correctly when processed by the LKID-42 markdown pipeline

**Dependencies:** LKID-42 (markdown rendering pipeline must exist to display it)

---

### LKID-44: Week 1 technical update — authored content

**Type:** Story | **Points:** 2 | **Owner:** John Donaldson | **Labels:** `agent:john-donaldson`

**Description:** Write the Week 1 technical update for the client dashboard. This is the "Technical Update" section appended to `app/src/app/client/updates/2026-03-26-week-1.md` (below Husser's product update).

#### Technical Implementation Notes

**File to edit:** `app/src/app/client/updates/2026-03-26-week-1.md`

Replace the `## Technical Update — John Donaldson` placeholder (created by LKID-43) with the full authored content. Do not modify the frontmatter or the Product Update section.

**Mockup reference:** `agents/inga/drafts/client-dashboard-mockup.md` — Section 4.2 (WeeklyUpdate), specifically the "Technical Update Section" subsection. Code blocks will render with `#F3F4F6` background, 8px radius, 16px padding, 14px monospace font.

#### Content Requirements

Minimum 500 words covering:
- Next.js 15 + shadcn + Tailwind frontend stack rationale
- FastAPI + Railway + PostgreSQL backend architecture
- How Lee's calc spec maps to the `/predict` endpoint
- Clerk magic-link auth and webhook-to-leads-table pipeline
- Playwright PDF generation approach (SVG fidelity from React chart)
- Technical tradeoffs (Railway vs AWS, single leads table vs full schema, stateless PDF re-rendering vs cached)

Lee can handle Python pseudocode-level detail.

#### Acceptance Criteria (Sharpened)

- [ ] Content appears under `## Technical Update — John Donaldson` in `app/src/app/client/updates/2026-03-26-week-1.md`
- [ ] Husser's frontmatter and Product Update section are untouched
- [ ] Minimum 500 words of authored content (no placeholder text)
- [ ] Covers all six technical areas listed above
- [ ] References specific sections of Lee's calc spec where applicable
- [ ] Any code snippets use fenced code blocks (``` ) so the markdown pipeline renders them correctly
- [ ] Tone is technical but clear — no unexplained acronyms
- [ ] Content renders correctly when processed by the LKID-42 markdown pipeline

**Dependencies:** LKID-43 (shares the same markdown file; coordinate on file structure)

---

### LKID-45: Sprint progress JSON and spec tracker JSON population

**Type:** Story | **Points:** 1 | **Owner:** Luca | **Labels:** `agent:luca`

**Description:** Create and populate the two JSON data files that drive the SprintTracker and SpecTracker dashboard components, plus the optional documents JSON.

#### Technical Implementation Notes

**Files to create:**

| File | Schema Reference |
|------|-----------------|
| `app/src/app/client/data/sprint-progress.json` | `~/.claude/skills/create-app-dashboard/references/data-schemas.md` — "sprint-progress.json" |
| `app/src/app/client/data/spec-tracker.json` | `~/.claude/skills/create-app-dashboard/references/data-schemas.md` — "spec-tracker.json" |
| `app/src/app/client/data/documents.json` | `~/.claude/skills/create-app-dashboard/references/data-schemas.md` — "documents.json" |

These are static JSON files read at build time by the Next.js page (Server Component). They are committed to the repo and updated manually as cards move through Jira.

**No code changes needed** — the `page.tsx` from LKID-40 already imports these files. Luca just needs to create valid JSON matching the schemas.

#### Data Contract

**sprint-progress.json** — full example in LKID-41 data contract section above. Must include:
- All Sprint 1 cards (LKID-30 through LKID-38 + dashboard cards LKID-39 through LKID-46) with accurate current statuses
- Sprint 2 cards (LKID-1 through LKID-3, LKID-6 through LKID-19) as `upcoming`
- Sprint 3 cards (LKID-4, LKID-5, LKID-20 through LKID-29) as `upcoming`

**spec-tracker.json** — full example in LKID-41 data contract section above. Must include at minimum:
- Section 3 rules engine (LKID-14, `unblocked`)
- eGFR threshold correction (12, not 15) — `done`
- Potassium field removal — `done`
- Four-input prediction form — `in_progress`
- Trajectory chart (4 lines) — `upcoming`
- Five pending items awaiting Lee's input — `blocked`

**documents.json** — full example in LKID-41 data contract section above. At least 4 documents.

#### Acceptance Criteria (Sharpened)

- [ ] `app/src/app/client/data/sprint-progress.json` exists and is valid JSON (passes `JSON.parse()`)
- [ ] Contains at least 3 sprint groups with accurate Sprint 1 statuses
- [ ] Sprint 2 and Sprint 3 cards are all listed as `upcoming`
- [ ] `app/src/app/client/data/spec-tracker.json` exists and is valid JSON
- [ ] Contains at least 5 spec items with statuses and notes
- [ ] Explicitly acknowledges eGFR threshold correction and potassium removal in notes fields
- [ ] Pending Lee items are listed with `blocked` status and notes explaining what is needed
- [ ] `app/src/app/client/data/documents.json` exists and is valid JSON with at least 4 documents
- [ ] All JSON files use only valid status values per schema (`done`, `in_progress`, `upcoming`, `blocked` for sprints; `done`, `in_progress`, `unblocked`, `blocked` for spec items)

**Dependencies:** None — can start immediately, no code dependency.

---

### LKID-46: Visual design review and brand consistency check

**Type:** Story | **Points:** 1 | **Owner:** Inga | **Labels:** `agent:inga`

**Description:** Review the deployed client dashboard for visual design quality and brand consistency. Verify against the mockup spec at `agents/inga/drafts/client-dashboard-mockup.md`.

#### Technical Implementation Notes

No code changes — this is a review task. Inga inspects the deployed dashboard (or local dev build) and compares against her mockup spec.

**Review checklist derived from mockup:**

| Check | Mockup Section | What to Verify |
|-------|---------------|----------------|
| Page background | Section 2 | `#F9F7F2` cream, not white |
| Card surfaces | Section 2 | `#FFFFFF` on card backgrounds |
| Section headings | Section 2, Typography | 24px/700/`#004D43` for all H2s |
| Body text | Section 2, Typography | 16px/400/`#010101`, line-height 26px |
| Muted text | Section 2, Typography | 14px/400/`#636363` for captions/authors |
| Timeline bar | Section 4.1 | 8px height, `#E5E7EB` track, lime marker |
| Status colors | Section 2, Status Colors | Done green, In Progress amber, Upcoming gray, Blocked red — all four combinations |
| PrototypePreview | Section 4.3 | Teal `#004D43` card bg, lime `#E6FF2B` CTA button, 52px button height |
| SpecTracker header | Section 4.5 | Teal bg row, white uppercase text |
| Document rows hover | Section 4.6 | Border `#898A8D`, bg `#FAFAFA` on hover |
| Ship date callout | Section 4.7 | Teal bg, lime accent bar left side |
| Footer | Section 5 | 12px/400/`#898A8D`, centered, 1px `#D8D8D8` top border |
| Spacing | Section 7 | 64px between sections, 32px card padding, 12px tile gaps |
| Mobile breakpoint | All Section 4.x "Responsive" subsections | Single column, reduced padding, stacked elements |
| Tablet breakpoint | All Section 4.x "Responsive" subsections | Two-column where applicable |
| Icons | Section 8 | Correct Lucide icons, correct sizes, correct colors |
| Focus rings | Section 6, Section 9 | Visible on all interactive elements, correct colors |

**Output:** `agents/inga/drafts/client-dashboard-review.md`

#### Acceptance Criteria (Sharpened)

- [ ] Every row in the review checklist above is verified and marked pass/fail with specific evidence
- [ ] Brand palette verified: no colors used outside the mockup Section 2 token table
- [ ] Typography check: system font stack loaded, sizes match typography scale table exactly
- [ ] Spacing check: measure 3+ section gaps to confirm 64px; measure 3+ card paddings to confirm 32px
- [ ] Responsive review at exactly 375px (mobile), 768px (tablet), and 1280px (desktop) viewport widths
- [ ] Any failures include the specific element, expected value (from mockup), actual value, and a screenshot or DOM selector
- [ ] Review document written to `agents/inga/drafts/client-dashboard-review.md`
- [ ] No "looks good" without evidence — every pass must cite the specific mockup section verified

**Dependencies:** LKID-40, LKID-41, LKID-42 (dashboard must be built before review)

---

## Reference: File Tree (What Harshit Creates)

```
app/src/
├── app/
│   └── client/
│       ├── [slug]/
│       │   ├── layout.tsx          # LKID-40: Isolated dashboard layout
│       │   ├── page.tsx            # LKID-40: Main page, imports all sections
│       │   └── not-found.tsx       # LKID-40: Generic 404
│       ├── data/
│       │   ├── sprint-progress.json  # LKID-45: Luca populates
│       │   ├── spec-tracker.json     # LKID-45: Luca populates
│       │   └── documents.json        # LKID-45: Luca populates
│       └── updates/
│           └── 2026-03-26-week-1.md  # LKID-43 + LKID-44: Husser + JD author
├── components/
│   ├── dashboard/
│   │   ├── DashboardHeader.tsx     # LKID-40
│   │   ├── DashboardFooter.tsx     # LKID-40
│   │   ├── HeroBanner.tsx          # LKID-41
│   │   ├── WeeklyUpdate.tsx        # LKID-42
│   │   ├── WeeklyUpdateList.tsx    # LKID-42
│   │   ├── PrototypePreview.tsx    # LKID-41
│   │   ├── SprintTracker.tsx       # LKID-41
│   │   ├── SpecTracker.tsx         # LKID-41
│   │   ├── DocumentLibrary.tsx     # LKID-41
│   │   └── Horizon.tsx             # LKID-41
│   └── ui/
│       ├── badge.tsx               # Add via: npx shadcn@latest add badge
│       └── table.tsx               # Add via: npx shadcn@latest add table
└── lib/
    └── markdown.ts                 # LKID-42: gray-matter + remark utilities
```
