# Client Dashboard — Visual Design Mockup

**Card:** LKID-39
**Author:** Inga (UX/UI Designer)
**Date:** 2026-03-26
**Status:** Draft
**Audience:** Harshit (Frontend Developer) — implement from this spec

---

## 1. Layout Grid

### Container

- Max-width: **1024px**, centered with `margin: 0 auto`
- Horizontal padding: **24px** (mobile), **32px** (tablet), **0** (desktop, container handles centering)
- Page background: **#F9F7F2** (cream)

### Vertical Rhythm

- Section gap: **64px** between all top-level sections
- Inner section padding: **32px** top/bottom within cards or bordered regions
- Sub-section gap: **24px** between elements within a section

### Responsive Breakpoints

| Token | Range | Behavior |
|-------|-------|----------|
| `mobile` | < 768px | Single column, full-width elements, stacked layouts |
| `tablet` | 768px - 1024px | Two-column where applicable, reduced gaps |
| `desktop` | > 1024px | Full layout, 1024px max-width container |

---

## 2. Design Tokens — Dashboard Palette

### Brand Mapping

| Token | Hex | Usage |
|-------|-----|-------|
| `--dash-bg` | `#F9F7F2` | Page background |
| `--dash-surface` | `#FFFFFF` | Card backgrounds, table rows |
| `--dash-primary` | `#004D43` | Section headings, primary text, header bar |
| `--dash-accent` | `#E6FF2B` | "You are here" marker, active sprint highlight, CTA button bg |
| `--dash-text` | `#010101` | Body text, table cell text |
| `--dash-text-muted` | `#636363` | Captions, secondary text, author attributions |
| `--dash-border` | `#D8D8D8` | Card borders, table borders, dividers |
| `--dash-border-subtle` | `#E8E8E8` | Inner dividers within cards |

### Status Colors

| Status | Background | Text | Border | Usage |
|--------|-----------|------|--------|-------|
| Done | `#DCFCE7` | `#166534` | `#BBF7D0` | Sprint tiles, spec badges |
| In Progress | `#FEF3C7` | `#92400E` | `#FDE68A` | Sprint tiles, spec badges |
| Upcoming | `#F3F4F6` | `#6B7280` | `#E5E7EB` | Sprint tiles, spec badges |
| Blocked | `#FEE2E2` | `#991B1B` | `#FECACA` | Sprint tiles, spec badges |
| Unblocked | `#DBEAFE` | `#1E40AF` | `#BFDBFE` | Spec badges only |

### Typography Scale

All text uses the system font stack (`font-family: system-ui, -apple-system, sans-serif`). Code blocks use `font-family: ui-monospace, monospace`.

| Element | Size | Weight | Line Height | Color |
|---------|------|--------|-------------|-------|
| Page title ("Project Dashboard") | 14px | 500 | 20px | `#636363` |
| Section heading (H2) | 24px | 700 | 32px | `#004D43` |
| Sub-heading (H3) | 18px | 600 | 28px | `#010101` |
| Body text | 16px | 400 | 26px | `#010101` |
| Caption / muted | 14px | 400 | 20px | `#636363` |
| Small label | 12px | 500 | 16px | `#636363` |
| Badge text | 12px | 600 | 16px | (per status) |
| Code / monospace | 14px | 400 | 22px | `#010101` |

---

## 3. Visual Hierarchy

### Eye Flow (top to bottom)

1. **Hero timeline bar** — the lime "You are here" marker draws the eye immediately on page load
2. **Weekly Update** — largest content block, anchored by bold week header
3. **"View Prototype" CTA** — lime background button, highest contrast element on the page
4. **Sprint Tracker tiles** — color-coded grid creates a scannable progress pattern
5. **Spec Tracker table** — structured data, secondary importance
6. **Document Library** — reference links, low visual weight
7. **Horizon** — forward-looking, final anchor

### Section Separation

- Each section is separated by **64px** of vertical space (no visible divider)
- Sections 2 (Weekly Update) and 3 (Prototype Preview) use white card surfaces against the cream background — this elevation change provides visual separation
- Sections 4 (Sprint Tracker) and 5 (Spec Tracker) sit directly on the cream background without card wrapping — the colored tiles and table provide their own visual containment
- A **1px solid #D8D8D8** horizontal rule appears only between stacked weekly update entries

---

## 4. Section-by-Section Visual Spec

---

### 4.1 HeroBanner

**shadcn components:** None required (custom HTML)

**Layout:**
- Full width of container
- Flex column, `align-items: center`, `gap: 24px`
- Padding: **48px 0 32px 0**

**Logo + Label Row:**
- Flex row, `align-items: center`, `gap: 12px`
- Logo: 40px height, auto width (or text fallback "KidneyHood" at 24px/700/#004D43)
- "Project Dashboard" label: 14px/500/#636363, vertically centered with logo

**Timeline Bar:**
- Width: **100%** of container
- Height: **8px**
- Background: `#E5E7EB` (full bar track)
- Border-radius: **4px**
- Sprint segments rendered as colored overlays within the bar:
  - Completed sprint: **#004D43** (teal, solid fill)
  - Current sprint: **#004D43** at **40% opacity** (lighter teal)
  - Future sprint: stays as track color (`#E5E7EB`)

**"You are here" Marker:**
- Position: absolute, calculated as percentage of total project duration
- Indicator: **12px diameter circle**, fill **#E6FF2B** (lime), border **2px solid #004D43**
- Vertical position: centered on the bar, protruding 2px above and below
- Label below marker: "You are here" in 12px/500/#636363, centered under the dot
- Drop: a **2px wide, 16px tall** vertical line from the dot down to the label, color **#004D43**

**Sprint Labels Row:**
- Flex row, `justify-content: space-between`
- Each label block:
  - Sprint name: 14px/600/#010101
  - Date range: 12px/400/#636363
  - Alignment: each label centered under its sprint segment

**Responsive (mobile):**
- Timeline bar replaced by a **vertical list**
- Each sprint as a row: `[status dot] Sprint Name — Dates`
- Status dot: 8px circle, same color logic as bar segments
- "You are here" marker becomes a lime left-border (3px) on the current sprint row
- Gap between rows: 12px
- Padding: 32px 0 24px 0

---

### 4.2 WeeklyUpdate

**shadcn components:** `Card`, `CardHeader`, `CardContent`, `Badge`

**Overall Container:**
- Flex column, `gap: 0` (weeks separated by dividers, not gaps)
- Each week is a separate `Card`

**Week Card:**
- Background: **#FFFFFF**
- Border: **1px solid #D8D8D8**
- Border-radius: **12px**
- Padding: **32px**
- Margin-bottom: **24px** between week cards

**Week Header:**
- Text: "Week N -- Month DD, YYYY"
- Style: 24px/700/#004D43
- Sprint badge next to header: shadcn `Badge` with variant `outline`, text "Sprint N", 12px/500, border color #004D43, text color #004D43
- Margin-bottom: **20px**

**Highlights Block:**
- Margin-bottom: **28px**
- Unordered list, each item:
  - Flex row, `align-items: flex-start`, `gap: 8px`
  - Icon: checkmark circle, 16px, color **#166534** (green)
  - Text: 16px/400/#010101
  - Gap between items: **8px**

**Product Update Section:**
- Header: "Product Update" in 18px/600/#010101
- Author line below: "Husser, Product Manager" in 14px/400/#636363, with a small avatar circle placeholder (24px diameter, #D8D8D8 background, initials "H" in 12px/500/#636363)
- Margin below author: **16px**
- Body: rendered markdown, 16px/400/#010101, line-height 26px
- Paragraphs separated by **16px** margin
- Inner headings (H3 in markdown) rendered at 16px/600/#010101

**Technical Update Section:**
- Separated from Product Update by **1px solid #E8E8E8** divider with **28px** margin above and below
- Header: "Technical Update" in 18px/600/#010101
- Author line: "John Donaldson, API Designer" in 14px/400/#636363, same avatar style (initials "JD")
- Body: same rendering as Product Update
- Code blocks: background **#F3F4F6**, border-radius **8px**, padding **16px**, font 14px/monospace

**Older Weeks:**
- All weeks render in full (not collapsed)
- Visual de-emphasis: the most recent week card has no additional treatment; older week cards have the same styling but the natural scroll position means the newest is always seen first
- If more than 3 weeks exist, add a "Show earlier updates" text button below the 3rd card: 14px/600/#004D43, no border, underline on hover

**Responsive (mobile):**
- Card padding reduces to **20px**
- Week header: 20px/700
- Sprint badge wraps to its own line below the header
- Avatar circles hidden on mobile to save space

---

### 4.3 PrototypePreview

**shadcn components:** `Card`, `CardContent`, `Button`

**Card:**
- Background: **#004D43** (teal, dark card — this is the highest-contrast section)
- Border: none
- Border-radius: **12px**
- Padding: **40px**

**Section Title:**
- "Live Prototype" in 24px/700/#FFFFFF
- Margin-bottom: **8px**

**Caption:**
- "Click through all 7 screens — real layout, real components, chart placeholder"
- Style: 16px/400/#FFFFFF at 80% opacity
- Margin-bottom: **24px**

**CTA Button ("View Prototype"):**
- shadcn `Button` size `lg`
- Background: **#E6FF2B** (lime)
- Text: **#004D43** (teal), 16px/700
- Border: none
- Border-radius: **8px**
- Padding: **14px 32px**
- Height: **52px**
- Hover state: background **#D4ED26** (slightly darker lime), cursor pointer
- Focus ring: **2px solid #FFFFFF**, offset **2px**
- Margin-bottom: **32px**
- This is the single most prominent interactive element on the entire page

**Screenshot Grid:**
- Display: `grid`, 3 columns, `gap: 16px`
- Each screenshot:
  - Border-radius: **8px**
  - Border: **2px solid rgba(255,255,255,0.2)**
  - Aspect ratio: **16/10** (landscape)
  - Object-fit: cover
  - Alt text required for each image
- Below each screenshot: caption in 12px/400/#FFFFFF at 60% opacity

**Responsive (tablet):**
- Grid: 2 columns
- CTA button: full width

**Responsive (mobile):**
- Grid: 1 column, screenshots stack
- CTA button: full width
- Card padding: **24px**
- Section title: 20px

---

### 4.4 SprintTracker

**shadcn components:** `Card`, `Badge`

**Section Header:**
- "Sprint Progress" in 24px/700/#004D43
- Margin-bottom: **32px**

**Sprint Group:**
- One group per sprint
- Group header: flex row, `justify-content: space-between`, `align-items: center`
  - Sprint name + dates: 18px/600/#010101
  - Summary: "X of Y complete" in 14px/400/#636363
- Margin-bottom below group header: **16px**
- Margin-bottom between sprint groups: **32px**

**Tile Grid:**
- Display: `flex`, `flex-wrap: wrap`, `gap: 12px`

**Individual Tile:**
- Width: **calc((100% - 36px) / 4)** on desktop (4 per row with 3 gaps of 12px)
- Min-width: **140px** (prevents tiles from getting too narrow)
- Height: auto (content-driven)
- Padding: **16px**
- Border-radius: **10px**
- Border: **1px solid** (color per status, see table below)
- Background: per status (see table below)

| Status | Tile BG | Tile Border | Icon |
|--------|---------|-------------|------|
| Done | `#DCFCE7` | `#BBF7D0` | Checkmark circle, 16px, `#166534` |
| In Progress | `#FEF3C7` | `#FDE68A` | Arrow-right circle, 16px, `#92400E` |
| Upcoming | `#F3F4F6` | `#E5E7EB` | No icon |
| Blocked | `#FEE2E2` | `#FECACA` | X circle, 16px, `#991B1B` |

**Tile Content:**
- Card ID: 12px/600/(status text color), margin-bottom 4px
- Card title: 14px/400/#010101, truncated with `text-overflow: ellipsis` after 2 lines (`-webkit-line-clamp: 2`)
- Icon: positioned top-right of tile, absolute, 8px from top and right edges

**Responsive (tablet):**
- Tiles: 3 per row — width `calc((100% - 24px) / 3)`

**Responsive (mobile):**
- Tiles: 2 per row — width `calc((100% - 12px) / 2)`
- Tile padding: **12px**
- Card title: 1-line clamp

---

### 4.5 SpecTracker

**shadcn components:** `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `Badge`

**Section Header:**
- "Spec Acknowledgment" in 24px/700/#004D43
- Subtext: "X of Y spec items addressed" in 14px/400/#636363
- Margin-bottom: **24px**

**Table Container:**
- Background: **#FFFFFF**
- Border: **1px solid #D8D8D8**
- Border-radius: **12px**
- Overflow: hidden (so border-radius clips the table)

**Table Header Row:**
- Background: **#004D43**
- Text: 12px/600/#FFFFFF, uppercase, letter-spacing **0.5px**
- Padding: **12px 16px** per cell
- No bottom border (teal fills the row)

**Column Widths (desktop):**

| Column | Width | Alignment |
|--------|-------|-----------|
| Spec Item | 35% | Left |
| Card | 15% | Left |
| Status | 15% | Center |
| Notes | 35% | Left |

**Table Body Rows:**
- Background: **#FFFFFF**, alternating rows **#FAFAFA**
- Text: 14px/400/#010101
- Padding: **14px 16px** per cell
- Border-bottom: **1px solid #E8E8E8**
- Last row: no bottom border

**Card Column:**
- Jira card ID displayed as a subtle link style: 14px/500/#004D43, no underline, underline on hover

**Status Badge:**
- Pill shape: border-radius **9999px**
- Padding: **4px 12px**
- Font: 12px/600
- Colors per status:

| Status | Badge BG | Badge Text |
|--------|----------|------------|
| Done | `#DCFCE7` | `#166534` |
| In Progress | `#FEF3C7` | `#92400E` |
| Unblocked | `#DBEAFE` | `#1E40AF` |
| Blocked | `#FEE2E2` | `#991B1B` |

**Notes Column:**
- Text: 14px/400/#636363
- Max 2 lines with ellipsis; full text shown in a tooltip on hover (use `title` attribute)

**Responsive (mobile):**
- Table wrapper: `overflow-x: auto` with `-webkit-overflow-scrolling: touch`
- First column (Spec Item): `position: sticky`, `left: 0`, `z-index: 1`, background **#FFFFFF** (or **#FAFAFA** for alternating rows), box-shadow **2px 0 4px rgba(0,0,0,0.05)** on the right edge
- Min-width on table: **600px** to prevent column crushing
- Column widths on scroll: Spec Item 180px, Card 100px, Status 100px, Notes 220px

---

### 4.6 DocumentLibrary

**shadcn components:** `Card`, `CardContent`, `Badge`

**Section Header:**
- "Documents" in 24px/700/#004D43
- Margin-bottom: **24px**

**Document List:**
- Flex column, `gap: 12px`

**Document Row:**
- Background: **#FFFFFF**
- Border: **1px solid #D8D8D8**
- Border-radius: **10px**
- Padding: **16px 20px**
- Display: flex row, `align-items: center`, `gap: 16px`
- Hover: border-color transitions to **#898A8D**, background **#FAFAFA**, cursor pointer

**Document Icon:**
- 32px x 32px container
- Background: **#F3F4F6**
- Border-radius: **8px**
- Icon centered: 16px, color **#636363**
- Icon mapping:
  - `pdf` = file-text icon
  - `markdown` = file-code icon
  - `spreadsheet` = table icon
  - `external` = external-link icon

**Document Text:**
- Flex column, `gap: 2px`, flex: 1
- Name: 16px/500/#010101
- Description: 14px/400/#636363

**"New" Badge:**
- Positioned at the right end of the row
- shadcn `Badge`: background **#E6FF2B**, text **#004D43**, 12px/600
- Border-radius: **9999px**
- Padding: **2px 10px**
- Only shown when `isNew: true`

**Responsive (mobile):**
- Same layout, padding reduces to **12px 16px**
- Icon shrinks to 28px
- "New" badge moves below the description text, aligned left

---

### 4.7 Horizon

**shadcn components:** `Card`, `CardHeader`, `CardContent`

**Section Header:**
- "What's Coming" in 24px/700/#004D43
- Margin-bottom: **24px**

**Sprint Preview Cards:**
- Display: `grid`, 2 columns, `gap: 16px`
- Each card:
  - Background: **#FFFFFF**
  - Border: **1px solid #D8D8D8**
  - Border-radius: **12px**
  - Padding: **24px**

**Card Header:**
- Sprint name: 18px/600/#010101
- Date range: 14px/400/#636363, margin-top 4px
- Status badge: positioned top-right of card content
  - "Up Next": background **#FEF3C7**, text **#92400E**
  - "Planned": background **#F3F4F6**, text **#6B7280**
- Margin-bottom: **16px**

**Deliverables List:**
- Unordered list, bullet style: 6px diameter circle, color **#004D43**
- Text: 14px/400/#010101
- Gap between items: **8px**
- Padding-left: **16px**

**Ship Date Callout:**
- Margin-top: **24px** (below the sprint cards)
- Full width of container
- Background: **#004D43** (teal)
- Border-radius: **12px**
- Padding: **24px 32px**
- Text: "Target launch: April 17, 2026"
- Style: 18px/700/#FFFFFF
- Subtext (optional): 14px/400/#FFFFFF at 80% opacity
- A small lime accent bar: **4px wide, 32px tall**, positioned left side, background **#E6FF2B**, border-radius **2px**

**Responsive (mobile):**
- Sprint preview cards: 1 column
- Ship date callout padding: **20px 24px**
- Ship date text: 16px

---

## 5. Page Footer

**Layout:**
- Margin-top: **64px**
- Padding: **24px 0 32px 0**
- Border-top: **1px solid #D8D8D8**
- Text-align: center

**Content:**
- "Powered by Automation Architecture" in 12px/400/#898A8D
- "Last updated: [date]" on a second line, same style
- Gap between lines: **4px**

---

## 6. Interaction States

### Links
- Default: **#004D43**, no underline
- Hover: **#004D43**, underline
- Focus: **2px solid #E6FF2B** outline, **2px** offset

### Buttons (CTA)
- Default: bg **#E6FF2B**, text **#004D43**
- Hover: bg **#D4ED26**
- Active/pressed: bg **#C2DB14**
- Focus: **2px solid #FFFFFF** ring (on dark bg) or **2px solid #004D43** ring (on light bg)
- Disabled: bg **#E5E7EB**, text **#9CA3AF**, cursor not-allowed

### Cards
- Default: border **#D8D8D8**
- Hover (for interactive cards like documents): border **#898A8D**, bg **#FAFAFA**

### Table Rows
- Hover: bg **#F9FAFB**

---

## 7. Spacing Quick Reference

This table gives Harshit copy-paste values for the most common spacing decisions.

| Context | Value |
|---------|-------|
| Section-to-section gap | 64px |
| Section heading to content | 24px |
| Card padding (desktop) | 32px |
| Card padding (mobile) | 20px |
| Card border-radius | 12px |
| Tile border-radius | 10px |
| Badge border-radius | 9999px (pill) |
| Between list items | 8px |
| Between paragraphs (markdown) | 16px |
| Between cards in a grid | 16px |
| Between tiles in flex grid | 12px |
| Inner divider margin (above/below) | 28px |
| Page horizontal padding (mobile) | 24px |
| Page horizontal padding (tablet) | 32px |

---

## 8. Icon Reference

Use Lucide icons (bundled with shadcn). Specific icons for each context:

| Context | Icon Name | Size | Color |
|---------|-----------|------|-------|
| Done status | `check-circle-2` | 16px | `#166534` |
| In Progress status | `arrow-right-circle` | 16px | `#92400E` |
| Blocked status | `x-circle` | 16px | `#991B1B` |
| Highlight bullet | `check-circle-2` | 16px | `#166534` |
| Document: PDF | `file-text` | 16px | `#636363` |
| Document: Markdown | `file-code` | 16px | `#636363` |
| Document: Spreadsheet | `table` | 16px | `#636363` |
| Document: External | `external-link` | 16px | `#636363` |
| "New" indicator | (use Badge, no icon) | -- | -- |
| Ship date accent | (lime bar, no icon) | -- | `#E6FF2B` |

---

## 9. Accessibility Notes

- All color combinations meet WCAG AA contrast ratios:
  - #004D43 on #F9F7F2 = 9.7:1 (passes AAA)
  - #004D43 on #E6FF2B = 7.2:1 (passes AAA)
  - #FFFFFF on #004D43 = 9.7:1 (passes AAA)
  - #010101 on #FFFFFF = 21:1 (passes AAA)
  - #636363 on #FFFFFF = 5.9:1 (passes AA)
  - #636363 on #F9F7F2 = 5.5:1 (passes AA)
- Status colors are never the sole indicator — always paired with text labels or icons
- Focus rings visible on all interactive elements
- Timeline "You are here" marker uses both color (lime) and shape (circle + line) for non-color differentiation
- Sticky table column has sufficient shadow to indicate scrollable content behind it
- All images require alt text
- Semantic HTML: use `<table>` for SpecTracker, `<nav>` is not needed (no navigation), `<main>` wraps all content, `<footer>` for the page footer
