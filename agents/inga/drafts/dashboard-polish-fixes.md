# Dashboard Polish Fixes -- Remaining Items

**Author:** Inga (UX/UI Designer)
**Date:** 2026-03-26
**Source:** `agents/inga/drafts/client-dashboard-review.md` -- medium and low priority items
**Target:** Harshit -- all changes are CSS/className-level, no structural rework

---

## Status

The high-priority items (1--4) and several medium items (5, 7, 8, 10) are already fixed on `main`. This document covers the **12 remaining items** that still need attention. They are ordered by impact -- tackle the quick wins first.

---

## Fix 1 -- WeeklyUpdate: Replace HTML checkmark with Lucide icon

**Review ref:** Medium #9, Section 6
**File:** `app/src/components/dashboard/WeeklyUpdate.tsx`
**Why:** The plain text checkmark (`&#10003;`) looks cheap next to the polished avatars and typography. The Lucide icon adds visual weight and consistency.

Add import at top of file:

```diff
+ import { CheckCircle2 } from "lucide-react";
```

Replace line 70:

```diff
- <span style={{ color: "#166534" }}>&#10003;</span>
+ <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: "#166534" }} />
```

The `mt-0.5` aligns the icon with the first line of text. `shrink-0` prevents it from collapsing in flex.

---

## Fix 2 -- WeeklyUpdate: Add Sprint badge next to week header

**Review ref:** Section 6
**File:** `app/src/components/dashboard/WeeklyUpdate.tsx`
**Why:** Lee should immediately see which sprint a weekly update belongs to. The spec calls for a shadcn-style outline badge.

Replace the h3 block (line 59):

```diff
- <h3 className="text-2xl font-bold" style={{ color: "#004D43" }}>
-   {update.title}
- </h3>
+ <div className="flex items-center gap-3">
+   <h3 className="text-2xl font-bold" style={{ color: "#004D43" }}>
+     {update.title}
+   </h3>
+   <span
+     className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
+     style={{ borderColor: "#004D43", color: "#004D43" }}
+   >
+     Sprint 1
+   </span>
+ </div>
```

Note: For now this is hardcoded to "Sprint 1" since we only have one update. When we add future weeks, derive the sprint number from the update data (add a `sprint` field to the `UpdateData` interface).

---

## Fix 3 -- SprintTracker: Add status icons to tiles

**Review ref:** Medium #6, Section 4
**File:** `app/src/components/dashboard/SprintTracker.tsx`
**Why:** The spec puts a status icon top-right of each tile as the primary visual indicator. Currently only a text label exists at the bottom.

Add import at top of file:

```diff
+ import { CheckCircle2, ArrowRightCircle, XCircle, Circle } from "lucide-react";
```

Add icon map after STATUS_LABELS:

```diff
+ const STATUS_ICONS: Record<string, React.ReactNode> = {
+   done: <CheckCircle2 size={16} />,
+   in_progress: <ArrowRightCircle size={16} />,
+   blocked: <XCircle size={16} />,
+   upcoming: <Circle size={16} />,
+ };
```

Change the tile div to `relative` and add the icon (inside the card div, after the opening tag on line 42):

```diff
  <div
    key={card.id}
-   className="border p-3 md:p-4"
+   className="relative border p-3 md:p-4"
    style={{
      borderRadius: "10px",
      backgroundColor: style.bg,
      borderColor: style.border,
    }}
  >
+   <div className="absolute right-2 top-2" style={{ color: style.text }}>
+     {STATUS_ICONS[card.status]}
+   </div>
    <div className="text-xs font-medium" style={{ color: style.text }}>
```

The text status label at the bottom (line 58--60) can remain as a secondary indicator -- having both icon and text is fine for accessibility.

---

## Fix 4 -- SpecTracker: Style Card column as teal link

**Review ref:** Section 5
**File:** `app/src/components/dashboard/SpecTracker.tsx`
**Why:** The Card column (e.g., "LKID-35") should look clickable. Teal color with underline on hover signals interactivity even before we wire up real links.

Replace the Card td (line 57--59):

```diff
- <td className="px-4 py-3" style={{ color: "#636363" }}>
-   {item.jira_card}
- </td>
+ <td className="px-4 py-3">
+   <span
+     className="cursor-default hover:underline"
+     style={{ color: "#004D43", fontWeight: 500 }}
+   >
+     {item.jira_card}
+   </span>
+ </td>
```

When real Jira links are available, replace the `<span>` with an `<a>` tag pointing to the Jira card URL.

---

## Fix 5 -- SpecTracker: Add line-clamp and title to Notes column

**Review ref:** Section 5
**File:** `app/src/components/dashboard/SpecTracker.tsx`
**Why:** Long notes can blow out the table row height. Clamping to 2 lines with a tooltip on hover keeps the table compact while preserving access to the full text.

Replace the Notes td (line 68--70):

```diff
- <td className="px-4 py-3 text-sm" style={{ color: "#636363" }}>
-   {item.notes}
- </td>
+ <td className="px-4 py-3 text-sm" style={{ color: "#636363" }}>
+   <span className="line-clamp-2" title={item.notes}>
+     {item.notes}
+   </span>
+ </td>
```

---

## Fix 6 -- SpecTracker: Mobile sticky first column

**Review ref:** Section 5
**File:** `app/src/components/dashboard/SpecTracker.tsx`
**Why:** On mobile the table scrolls horizontally, but the Spec Item column disappears. Sticky positioning keeps it visible so Lee always knows which row he is reading.

On the Spec Item `<th>` (line 36), add sticky styles:

```diff
- <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white" scope="col" style={{ width: "35%" }}>Spec Item</th>
+ <th
+   className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white md:static"
+   scope="col"
+   style={{ width: "35%", position: "sticky", left: 0, zIndex: 10, backgroundColor: "#004D43" }}
+ >Spec Item</th>
```

On every Spec Item `<td>` (line 54--56), add matching sticky:

```diff
- <td className="px-4 py-3 font-medium" style={{ color: "#010101" }}>
+ <td
+   className="px-4 py-3 font-medium md:static"
+   style={{ color: "#010101", position: "sticky", left: 0, zIndex: 5, backgroundColor: "inherit" }}
+ >
```

The `backgroundColor: "inherit"` picks up the alternating row color. `md:static` removes the sticky on desktop where the full table is visible.

---

## Fix 7 -- DocumentLibrary: Replace text labels with Lucide icons

**Review ref:** Medium #9, Section 1
**File:** `app/src/components/dashboard/DocumentLibrary.tsx`
**Why:** "PDF" and "MD" as text inside a box look like placeholders. Lucide file icons are cleaner and immediately recognizable.

Add import at top of file:

```diff
+ import { FileText, FileCode } from "lucide-react";
```

Replace the icon div (line 45--52):

```diff
- <div
-   className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
-   style={{
-     backgroundColor: "#F3F4F6",
-     color: "#636363",
-   }}
- >
-   {doc.type === "pdf" ? "PDF" : "MD"}
- </div>
+ <div
+   className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
+   style={{ backgroundColor: "#F3F4F6" }}
+ >
+   {doc.type === "pdf"
+     ? <FileText size={20} style={{ color: "#636363" }} />
+     : <FileCode size={20} style={{ color: "#636363" }} />}
+ </div>
```

---

## Fix 8 -- Horizon: Replace bullet character with styled dot

**Review ref:** Section 9
**File:** `app/src/components/dashboard/Horizon.tsx`
**Why:** The `&bull;` character renders at different sizes across browsers. A CSS circle is pixel-perfect and uses the brand teal.

Replace the bullet span in deliverable items (line 63--65):

```diff
- <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#010101" }}>
-   <span aria-hidden="true" style={{ color: "var(--brand-body)" }}>&bull;</span>
-   {d}
- </li>
+ <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#010101" }}>
+   <span
+     aria-hidden="true"
+     className="mt-1.5 shrink-0 rounded-full"
+     style={{ width: "6px", height: "6px", backgroundColor: "#004D43" }}
+   />
+   {d}
+ </li>
```

The `mt-1.5` vertically centers the dot with the first line of 14px text. `shrink-0` prevents flex from collapsing it.

---

## Fix 9 -- WeeklyUpdate: Divider margins 24px to 28px

**Review ref:** Low #15, Section 6
**File:** `app/src/components/dashboard/WeeklyUpdate.tsx`
**Why:** Minor spacing refinement -- 28px matches the spec's rhythm between sections within the card.

Two occurrences (lines 76 and 99):

```diff
- <hr className="my-6" style={{ borderColor: "#E8E8E8" }} />
+ <hr className="my-7" style={{ borderColor: "#E8E8E8" }} />
```

---

## Fix 10 -- HeroBanner: Add banner vertical padding

**Review ref:** Section 3
**File:** `app/src/components/dashboard/HeroBanner.tsx`
**Why:** The spec calls for 48px top / 32px bottom padding on the hero section. Currently relies only on the parent container's py-10.

On the outer `<section>` (line 31):

```diff
- <section className="space-y-6" aria-labelledby="project-timeline-heading">
+ <section className="space-y-6" aria-labelledby="project-timeline-heading" style={{ paddingTop: "48px", paddingBottom: "32px" }}>
```

Note: This interacts with the parent `<main>` which has `py-10` (40px). Since the hero is the first section, the effective top spacing will be 40px + 48px = 88px. If that feels too much visually, the `py-10` on `<main>` could be reduced to `pt-0` and let each section own its spacing. Test in the browser.

---

## Fix 11 -- SprintTracker: Add min-width to tiles

**Review ref:** Section 4
**File:** `app/src/components/dashboard/SprintTracker.tsx`
**Why:** On very narrow viewports, the 2-column grid can crush tiles below readable width. A 140px floor prevents this.

Add `minWidth` to the tile style (line 43):

```diff
  style={{
    borderRadius: "10px",
+   minWidth: "140px",
    backgroundColor: style.bg,
    borderColor: style.border,
  }}
```

---

## Fix 12 -- PrototypePreview: Screenshot grid placeholder

**Review ref:** Low #16, Section 8
**File:** `app/src/components/dashboard/PrototypePreview.tsx`
**Why:** The spec calls for a 3-column grid of screenshot thumbnails below the CTA. This gives Lee a visual preview of the prototype screens.

Add after the CTA link (after line 19):

```diff
      </a>
+
+     {/* Screenshot thumbnails -- replace src with real captures */}
+     <div className="mt-8 grid grid-cols-3 gap-3">
+       {["Landing", "Email Entry", "Prediction Form"].map((label) => (
+         <div
+           key={label}
+           className="flex items-center justify-center rounded-lg text-xs font-medium"
+           style={{
+             backgroundColor: "rgba(255,255,255,0.1)",
+             color: "rgba(255,255,255,0.6)",
+             aspectRatio: "16/10",
+           }}
+         >
+           {label}
+         </div>
+       ))}
+     </div>
    </section>
```

This is a placeholder grid. Once real screenshots are captured (via Playwright or manual), replace the placeholder divs with `<img>` tags. The `aspectRatio: 16/10` approximates a browser viewport shape.

---

## Summary

| # | Component | Change | Effort |
|---|-----------|--------|--------|
| 1 | WeeklyUpdate | Lucide checkmark icon | 2 min |
| 2 | WeeklyUpdate | Sprint badge on week header | 3 min |
| 3 | SprintTracker | Status icons on tiles | 5 min |
| 4 | SpecTracker | Teal link style on Card column | 2 min |
| 5 | SpecTracker | line-clamp + title on Notes | 1 min |
| 6 | SpecTracker | Mobile sticky first column | 3 min |
| 7 | DocumentLibrary | Lucide file icons | 2 min |
| 8 | Horizon | Styled dot bullets | 2 min |
| 9 | WeeklyUpdate | Divider margin 24px to 28px | 1 min |
| 10 | HeroBanner | Banner vertical padding | 1 min |
| 11 | SprintTracker | Tile min-width 140px | 1 min |
| 12 | PrototypePreview | Screenshot grid placeholder | 3 min |

**Total estimated effort:** ~26 minutes

Fixes 1--8 are the quick wins that most improve the professional feel. Fixes 9--12 are refinements that can wait if time is tight.
