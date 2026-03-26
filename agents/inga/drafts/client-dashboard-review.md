# Client Dashboard — Visual Design Review

**Card:** LKID-46
**Reviewer:** Inga (UX/UI Designer)
**Date:** 2026-03-26
**Reviewed against:** `client-dashboard-mockup.md` (Inga's binding visual spec)
**Deployed URL:** https://kidneyhood.vercel.app/client/lee-a3f8b2
**Branch:** `main` (post-merge)

---

## Review Summary

| # | Checklist Item | Verdict |
|---|---------------|---------|
| 1 | Brand palette | NEEDS ADJUSTMENT |
| 2 | Typography | NEEDS ADJUSTMENT |
| 3 | Spacing | NEEDS ADJUSTMENT |
| 4 | Sprint tracker tiles | NEEDS ADJUSTMENT |
| 5 | Spec tracker table | NEEDS ADJUSTMENT |
| 6 | Weekly update card | NEEDS ADJUSTMENT |
| 7 | Responsive behavior | PASS |
| 8 | "View Prototype" button | NEEDS ADJUSTMENT |
| 9 | Horizon section | NEEDS ADJUSTMENT |
| 10 | Overall visual hierarchy | NEEDS ADJUSTMENT |

**Overall verdict:** 1 of 10 items pass. The implementation captures the correct structure and data, but deviates from the mockup spec in typography scale, spacing rhythm, component styling, and several visual details. All issues are CSS-level fixes — no structural rework is needed.

---

## 1. Brand Palette — NEEDS ADJUSTMENT

**What passes:**
- Page background `#F9F7F2` (cream) is correct in `layout.tsx`.
- Header bar uses `#004D43` (teal) background — correct.
- Section headings use `#004D43` — correct.
- Lime `#E6FF2B` appears on the CTA button, "New" badge, and "You are here" marker — correct.
- Status colors (done/in_progress/upcoming/blocked) all match the spec exactly.

**What needs fixing:**

- **Timeline bar track color** is `#D8D8D8` but spec calls for `#E5E7EB`. The track should be a lighter gray.
  ```
  HeroBanner.tsx — change backgroundColor on the track div:
  - backgroundColor: "#D8D8D8"
  + backgroundColor: "#E5E7EB"
  ```

- **Sprint segment colors** use `#2563eb` (blue) and `#7c3aed` (purple) for sprints 2 and 3. The spec defines only two visual states: completed sprint = `#004D43` solid, current sprint = `#004D43` at 40% opacity. Future sprints stay as track color. Remove the arbitrary color array and apply teal-based logic.
  ```
  HeroBanner.tsx — replace the colors array with status-based logic:
  - const colors = ["#004D43", "#2563eb", "#7c3aed"];
  + // Determine sprint status based on current date
  + // Completed: backgroundColor "#004D43", opacity 1
  + // Current: backgroundColor "#004D43", opacity 0.4
  + // Future: no overlay (track color shows through)
  ```

- **Technical Update avatar** uses `#2563eb` (blue). Spec says avatar circle should use `#D8D8D8` background with `#636363` initials text. Only the Product Update avatar should be teal `#004D43`.
  ```
  WeeklyUpdate.tsx — Technical Update avatar:
  - backgroundColor: "#2563eb"
  + backgroundColor: "#D8D8D8"

  Also change text color on that avatar:
  - className="... text-white"
  + style={{ color: "#636363" }}
  ```

- **"Up Next" badge** in Horizon uses lime `#E6FF2B` bg. Spec says "Up Next" should use amber `#FEF3C7` bg with `#92400E` text.
  ```
  Horizon.tsx:
  - backgroundColor: sprint.status === "up_next" ? "#E6FF2B" : "#F3F4F6"
  - color: sprint.status === "up_next" ? "#004D43" : "#6B7280"
  + backgroundColor: sprint.status === "up_next" ? "#FEF3C7" : "#F3F4F6"
  + color: sprint.status === "up_next" ? "#92400E" : "#6B7280"
  ```

- **Document icon colors** use red/blue backgrounds (`#FEE2E2`/`#DBEAFE`) based on file type. Spec calls for a neutral `#F3F4F6` background with `#636363` icon color for all types, using Lucide icons (not text labels).
  ```
  DocumentLibrary.tsx — replace colored text icons with:
  - backgroundColor: doc.type === "pdf" ? "#FEE2E2" : "#DBEAFE"
  - color: doc.type === "pdf" ? "#991B1B" : "#1E40AF"
  + backgroundColor: "#F3F4F6"
  + color: "#636363"
  Also replace "PDF"/"MD" text with actual Lucide icon components.
  ```

---

## 2. Typography — NEEDS ADJUSTMENT

**What passes:**
- System font stack inherited from Tailwind defaults — correct.
- Muted text uses `#636363` — correct.

**What needs fixing:**

- **Page title "Project Dashboard"** renders at 14px/500 in the header bar (via layout.tsx) but the HeroBanner also renders "Project Dashboard" as a `<p>` at `text-base` (16px). The spec says the label should be 14px/500/#636363. Fix the HeroBanner version:
  ```
  HeroBanner.tsx:
  - <p className="mt-1 text-base" style={{ color: "#636363" }}>
  + <p className="mt-1 text-sm font-medium" style={{ color: "#636363" }}>
  ```

- **Section headings (H2)** use `text-xl` (20px). Spec requires **24px/700**.
  ```
  All components — change every H2:
  - className="text-xl font-bold"
  + className="text-2xl font-bold"
  ```
  Affected files: `WeeklyUpdate.tsx`, `PrototypePreview.tsx`, `SprintTracker.tsx`, `SpecTracker.tsx`, `DocumentLibrary.tsx`, `Horizon.tsx`.

- **Week card header (H3)** uses `text-lg` (18px). Spec says week header should be **24px/700/#004D43** (same size as H2, since it is the card's primary heading).
  ```
  WeeklyUpdate.tsx:
  - <h3 className="text-lg font-bold"
  + <h3 className="text-2xl font-bold"
  ```

- **Sub-headings** "Product Update" and "Technical Update" use `text-sm font-semibold` (14px/600). Spec requires **18px/600/#010101**.
  ```
  WeeklyUpdate.tsx — both occurrences:
  - <div className="text-sm font-semibold"
  + <div className="text-lg font-semibold"
  ```

- **Body text** in weekly updates uses `text-sm` (14px). Spec requires **16px/400**.
  ```
  WeeklyUpdate.tsx — both product and technical update body divs:
  - className="space-y-3 text-sm leading-relaxed"
  + className="space-y-3 text-base leading-relaxed"
  ```

- **Highlight list items** use `text-sm` (14px). Spec requires **16px/400**.
  ```
  WeeklyUpdate.tsx:
  - <li ... className="flex items-start gap-2 text-sm"
  + <li ... className="flex items-start gap-2 text-base"
  ```

- **Sprint group header** uses `text-base font-semibold` (16px). Spec requires **18px/600**.
  ```
  SprintTracker.tsx:
  - <h3 className="text-base font-semibold"
  + <h3 className="text-lg font-semibold"
  ```

- **Spec table header** uses `font-semibold`. Spec requires `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.5px`, `font-size: 12px`.
  ```
  SpecTracker.tsx — all <th> elements:
  - className="... font-semibold text-white"
  + className="... text-xs font-semibold uppercase tracking-wide text-white"
  + (where tracking-wide approximates 0.5px letter-spacing)
  ```

- **KidneyHood heading** in HeroBanner uses `text-2xl font-bold md:text-3xl`. Spec defines this as the logo row: 40px logo height or text fallback at **24px/700/#004D43** with "Project Dashboard" at 14px/500/#636363 beside it (flex row, not stacked).
  ```
  HeroBanner.tsx — restructure logo row:
  - <h1 className="text-2xl font-bold md:text-3xl">KidneyHood</h1>
  - <p className="mt-1 text-base">Project Dashboard</p>
  + <div className="flex items-center gap-3">
  +   <span className="text-2xl font-bold" style={{ color: "#004D43" }}>KidneyHood</span>
  +   <span className="text-sm font-medium" style={{ color: "#636363" }}>Project Dashboard</span>
  + </div>
  ```

---

## 3. Spacing — NEEDS ADJUSTMENT

**What passes:**
- Page max-width `1024px` and centering — correct.
- Horizontal padding `px-6 md:px-8 lg:px-0` — correct (24px/32px/0).

**What needs fixing:**

- **Section-to-section gap** is `space-y-16` (64px) on the page container. This is correct.

- **Card padding** in WeeklyUpdate is `p-6 md:p-8` (24px/32px). Spec requires **32px** at all non-mobile sizes. `p-6` at base is fine for mobile (spec says 20px, so `p-5` would be exact), but `md:p-8` is correct.
  ```
  WeeklyUpdate.tsx:
  - className="rounded-xl border p-6 md:p-8"
  + className="rounded-xl border p-5 md:p-8"
  ```

- **Inner section padding** within HeroBanner uses `space-y-6` (24px gap). Spec requires banner padding of **48px top, 32px bottom**:
  ```
  HeroBanner.tsx — add explicit padding:
  + style={{ padding: "48px 0 32px 0" }}
  ```

- **PrototypePreview** has no card wrapper. Spec requires a teal `#004D43` background card with 40px padding, 12px border-radius. Currently it renders as a plain section with `space-y-4`.
  ```
  PrototypePreview.tsx — wrap content in a dark card:
  + <div className="rounded-xl p-10" style={{ backgroundColor: "#004D43" }}>
  And update text colors to white per spec.
  ```

- **Sprint tile padding** is `p-3` (12px). Spec requires **16px** on desktop.
  ```
  SprintTracker.tsx:
  - className="rounded-lg border p-3"
  + className="rounded-lg border p-3 md:p-4"
  ```

- **Sprint tile gap** is `gap-2` (8px). Spec requires **12px**.
  ```
  SprintTracker.tsx:
  - className="grid grid-cols-2 gap-2 md:grid-cols-4"
  + className="grid grid-cols-2 gap-3 md:grid-cols-4"
  ```

- **Document row padding** is `p-4` (16px). Spec requires **16px 20px** (`py-4 px-5`).
  ```
  DocumentLibrary.tsx:
  - className="flex items-start gap-4 rounded-lg border p-4"
  + className="flex items-start gap-4 rounded-lg border px-5 py-4"
  ```

- **Horizon ship date padding** is `p-6` (24px). Spec requires **24px 32px** (`py-6 px-8`).
  ```
  Horizon.tsx:
  - className="rounded-xl p-6 text-center"
  + className="rounded-xl px-8 py-6"
  (Also remove text-center — spec uses left-aligned with lime accent bar.)
  ```

---

## 4. Sprint Tracker Tiles — NEEDS ADJUSTMENT

**What passes:**
- Status colors (bg, border) match the spec exactly.
- 4 columns on desktop, 2 on mobile — correct.
- `line-clamp-2` on card titles — correct.

**What needs fixing:**

- **Border-radius** is `rounded-lg` (8px). Spec requires **10px**.
  ```
  SprintTracker.tsx:
  - className="rounded-lg border p-3"
  + className="border p-3 md:p-4" style={{ borderRadius: "10px", ... }}
  ```

- **Tile title color** uses `style.text` (status color). Spec says title should be **#010101** (black), not status-colored. Only the card ID and status label should use the status text color.
  ```
  SprintTracker.tsx:
  - <div className="mt-1 line-clamp-2 text-sm" style={{ color: style.text }}>
  + <div className="mt-1 line-clamp-2 text-sm" style={{ color: "#010101" }}>
  ```

- **Status icons missing.** Spec requires a status icon positioned top-right of each tile (checkmark for done, arrow-right-circle for in-progress, x-circle for blocked). Currently there is no icon — only a text label at the bottom.
  ```
  SprintTracker.tsx — add Lucide icons:
  + import { CheckCircle2, ArrowRightCircle, XCircle } from "lucide-react";
  Position icon absolute, 8px from top-right of tile. Remove the text status label at the bottom (or keep it, but the icon is the primary indicator per spec).
  ```

- **Tile width** uses CSS grid `grid-cols-4`, which distributes evenly. Spec uses flex layout with `calc((100% - 36px) / 4)` and `min-width: 140px`. This is a minor difference — grid is acceptable if it renders the same layout, but `min-width` should be added to prevent crushing:
  ```
  SprintTracker.tsx — add min-width to tiles:
  + style={{ minWidth: "140px", ... }}
  ```

---

## 5. Spec Tracker Table — NEEDS ADJUSTMENT

**What passes:**
- Teal header row `#004D43` — correct.
- Alternating row backgrounds — correct (though `#FAFAF8` instead of spec's `#FAFAFA`, negligible).
- Status badge colors — correct.
- `overflow-x-auto` on the wrapper — correct.

**What needs fixing:**

- **Table container** has no outer border or border-radius. Spec requires a wrapping `div` with `border: 1px solid #D8D8D8`, `border-radius: 12px`, `overflow: hidden`.
  ```
  SpecTracker.tsx — wrap the <table> in a styled container:
  + <div className="overflow-hidden rounded-xl border" style={{ borderColor: "#D8D8D8" }}>
  ```

- **Header text** is not uppercase and has no letter-spacing. See Typography item above.

- **Status badge text** displays the raw status key (`done`, `in_progress`). Should display human-readable labels ("Done", "In Progress", "Unblocked", "Blocked").
  ```
  SpecTracker.tsx — add a label map:
  + const STATUS_LABELS: Record<string, string> = {
  +   done: "Done",
  +   in_progress: "In Progress",
  +   unblocked: "Unblocked",
  +   blocked: "Blocked",
  + };
  And use STATUS_LABELS[item.status] in the badge text.
  ```

- **Badge border-radius** is `rounded-full` which is correct (9999px equivalent). PASS.

- **Column widths** are not specified. Spec requires Spec Item 35%, Card 15%, Status 15%, Notes 35%. Add `width` styles to `<th>` elements.
  ```
  SpecTracker.tsx:
  <th style={{ width: "35%" }}>Spec Item</th>
  <th style={{ width: "15%" }}>Card</th>
  <th style={{ width: "15%" }}>Status</th>
  <th style={{ width: "35%" }}>Notes</th>
  ```

- **Card column** should be a link-styled element with `#004D43` color and underline on hover. Currently renders as plain muted text.

- **Notes column** lacks `line-clamp-2` and `title` attribute for tooltip on overflow.

- **Mobile sticky first column** is not implemented. Spec requires `position: sticky; left: 0` on the Spec Item column with a box-shadow on mobile.

---

## 6. Weekly Update Card — NEEDS ADJUSTMENT

**What passes:**
- White card on cream background — correct.
- Author avatars with initials — present.
- Highlight checkmarks — present (using HTML entity).
- Inner dividers with `#E8E8E8` — correct.

**What needs fixing:**

- **Checkmark icon** uses a plain text character (`&#10003;`). Spec requires Lucide `check-circle-2` icon at 16px in `#166534`.
  ```
  WeeklyUpdate.tsx:
  + import { CheckCircle2 } from "lucide-react";
  - <span style={{ color: "#166534" }}>&#10003;</span>
  + <CheckCircle2 size={16} style={{ color: "#166534", flexShrink: 0 }} />
  ```

- **Sprint badge** next to the week header is missing. Spec requires a shadcn `Badge` with variant `outline`, text "Sprint 1", border-color `#004D43`.

- **Section sub-heading margins** — "Product Update" header should have **28px** divider margin above and below. Current `my-6` (24px) is close but not exact.
  ```
  WeeklyUpdate.tsx:
  - <hr className="my-6"
  + <hr className="my-7"  (28px)
  ```

- **Author avatar size** is `h-8 w-8` (32px). Spec says **24px diameter** with 12px/500 initials text.
  ```
  WeeklyUpdate.tsx:
  - className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
  + className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
  ```

- **Card border-radius** is `rounded-xl` (12px). Correct per spec. PASS.

---

## 7. Responsive Behavior — PASS

The implementation handles the three breakpoints appropriately:

- **Mobile (< 768px):** Single column layouts, reduced padding, sprint labels stack vertically.
- **Tablet (768-1024px):** `md:` breakpoint applies 2-column grids where appropriate (Horizon cards), 4-column sprint tiles.
- **Desktop (> 1024px):** `lg:px-0` removes horizontal padding, 1024px max-width container handles centering.

**Minor note (non-blocking):** The spec calls for sprint tiles at 3 columns on tablet (`md:grid-cols-3`), but implementation jumps from 2 to 4 (`md:grid-cols-4`). This is functional but not spec-exact. Could add a `md:grid-cols-3 lg:grid-cols-4` step.

---

## 8. "View Prototype" Button — NEEDS ADJUSTMENT

**What passes:**
- Lime background `#E6FF2B` — correct.
- Teal text `#004D43` — correct.
- Bold weight — correct.
- Height `h-14` (56px) is close to spec's 52px.

**What needs fixing:**

- **PrototypePreview section is missing its teal card wrapper.** This is the highest-contrast section on the page per spec. Currently it renders as a flat section on the cream background with a plain heading. It should be a `#004D43` dark card with white text and the lime CTA button inside.
  ```
  PrototypePreview.tsx — full restructure:
  The entire section should be wrapped in:
  <div className="rounded-xl" style={{ backgroundColor: "#004D43", padding: "40px" }}>
    <h2 style={{ color: "#FFFFFF", fontSize: "24px", fontWeight: 700 }}>Live Prototype</h2>
    <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "16px" }}>...</p>
    <a ... CTA button ...>View Prototype</a>
  </div>
  ```

- **Button height** is `h-14` (56px). Spec says **52px**. Use a custom height:
  ```
  - className="inline-flex h-14 ..."
  + className="inline-flex ..." style={{ height: "52px", ... }}
  ```

- **Button border-radius** is `rounded-lg` (8px). Spec says **8px** — correct.

- **Hover state** uses `hover:opacity-90` (generic). Spec requires a specific darker lime `#D4ED26`.
  ```
  - className="... hover:opacity-90"
  + Add a hover:bg style. Since inline styles can't do hover, use a Tailwind arbitrary value:
  + className="... hover:bg-[#D4ED26]"
  ```

- **Focus ring** is missing. Spec requires `2px solid #FFFFFF`, offset 2px (on dark background).
  ```
  + className="... focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
  ```

- **Screenshot grid** is entirely missing. Spec calls for a 3-column grid of screenshot thumbnails below the CTA. This is content-dependent (requires actual screenshots), but the grid structure and placeholder images should exist.

---

## 9. Horizon Section — NEEDS ADJUSTMENT

**What passes:**
- Two-column grid for sprint preview cards on desktop — correct.
- Ship date callout with teal background — correct.
- Deliverable lists with bullets — correct.

**What needs fixing:**

- **Ship date callout layout** is `text-center`. Spec requires **left-aligned** with a **lime accent bar** (4px wide, 32px tall, `#E6FF2B`) on the left side.
  ```
  Horizon.tsx — ship date div:
  - className="rounded-xl p-6 text-center"
  + className="relative flex items-center gap-4 rounded-xl px-8 py-6"
  + Add the lime accent bar:
  + <div style={{ width: "4px", height: "32px", backgroundColor: "#E6FF2B", borderRadius: "2px", flexShrink: 0 }} />
  ```

- **"Target Launch" label** uses `text-sm`. Spec says **14px/400** at **80% opacity white**. Current color is lime `#E6FF2B` — spec says white at 80% opacity.
  ```
  Horizon.tsx:
  - <p className="text-sm font-medium" style={{ color: "#E6FF2B" }}>
  + <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
  ```

- **Ship date text** is `text-2xl` (24px). Spec says **18px/700/#FFFFFF**.
  ```
  Horizon.tsx:
  - <p className="mt-1 text-2xl font-bold text-white">
  + <p className="mt-1 text-lg font-bold text-white">
  ```

- **Sprint card title** uses `text-base font-bold` (16px). Spec says **18px/600**.
  ```
  Horizon.tsx:
  - <h3 className="text-base font-bold"
  + <h3 className="text-lg font-semibold"
  ```

- **Deliverable bullet** is a `&bull;` character. Spec requires **6px diameter circle, color #004D43**. Use a styled dot or CSS `list-style` with teal color.

---

## 10. Overall Visual Hierarchy — NEEDS ADJUSTMENT

**What passes:**
- Correct section ordering: HeroBanner, WeeklyUpdate, PrototypePreview, SprintTracker, SpecTracker, DocumentLibrary, Horizon.
- 64px section gaps maintained.
- Cream/white surface contrast pattern is present.
- Header bar with teal bg and lime accent text is professional and on-brand.

**What needs fixing:**

- **The PrototypePreview is visually flat** — the missing teal card wrapper means the highest-contrast element per the spec (the CTA region) blends into the cream background. This is the single biggest visual hierarchy problem. Fixing item 8 resolves this.

- **Footer** is missing the "Last updated" line. Spec requires two centered lines: "Powered by Automation Architecture" and "Last updated: [date]", both at 12px/400/#898A8D. Current footer text color is `#636363` instead of `#898A8D`, and the timestamp line is absent.
  ```
  layout.tsx footer:
  - <footer className="border-t py-6 text-center text-sm" style={{ borderColor: "#D8D8D8", color: "#636363" }}>
  -   Powered by Automation Architecture
  - </footer>
  + <footer className="border-t py-6 text-center text-xs" style={{ borderColor: "#D8D8D8", color: "#898A8D" }}>
  +   <p>Powered by Automation Architecture</p>
  +   <p className="mt-1">Last updated: March 26, 2026</p>
  + </footer>
  ```

- **Footer margin-top** of 64px is not explicit. The `space-y-16` on the page container handles gaps between sections but the footer sits outside `<main>`. Add `mt-16` to the footer or a spacer.

- **Duplicate branding:** Both the header bar (layout.tsx) and HeroBanner render "KidneyHood" and "Project Dashboard". The header bar handles this per the deployed layout, so the HeroBanner should transition its top row into the timeline bar section only (logo + label row in HeroBanner becomes redundant with the header). Alternatively, remove the text from HeroBanner and let the header bar serve as the sole branding element.

---

## Priority Summary

### High Priority (breaks visual design intent)

1. **PrototypePreview teal card wrapper** — the entire section is supposed to be a dark teal card. This is the biggest deviation from the mockup.
2. **Section heading size** — all H2s are 20px instead of 24px. This affects the entire page's typographic hierarchy.
3. **Sprint segment colors** — blue and purple on the timeline are off-brand. Should be teal-only.
4. **Spec tracker status labels** — displaying raw keys (`done`, `in_progress`) instead of human-readable text.

### Medium Priority (noticeable polish gaps)

5. Body text at 14px instead of 16px in WeeklyUpdate.
6. Missing status icons on sprint tiles.
7. Ship date callout layout (centered vs. left-aligned with lime bar).
8. Spec table missing outer border-radius container.
9. Missing Lucide icons for checkmarks and document types.
10. "Up Next" badge using lime instead of amber.

### Low Priority (refinements)

11. Avatar sizes (32px vs. 24px).
12. Technical Update avatar color (blue vs. gray).
13. Footer text color and missing timestamp.
14. Button height (56px vs. 52px).
15. Divider margins (24px vs. 28px).
16. Screenshot grid placeholder in PrototypePreview.
17. Tablet tile column count (4 vs. 3).

---

## Recommended Next Step

File these as a single fix commit on `main` or a dedicated branch. All changes are CSS/className-level. No structural refactoring, no new data, no new dependencies (except adding Lucide icon imports where noted). Estimated effort: 2-3 hours for Harshit.
