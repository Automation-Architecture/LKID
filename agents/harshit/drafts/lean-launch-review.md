# Lean Launch Review -- Frontend

**Author:** Harshit (Frontend Developer)
**Date:** 2026-03-25
**Status:** DECISION MADE

---

## Decision: Visx Interactive Chart (Variant A) -- FEASIBLE, NO BLOCKERS

The simplified scope makes the full interactive chart *easier*, not harder.

**What was removed:** Confidence tiers, stat cards, unlock prompts, multi-visit
slope, optional/silent field sections, account routes, history page. These were
the complex parts. The chart itself was always the straightforward piece.

**What remains for Variant A:**
- 4 trajectory lines with distinct colors and dash patterns -- `LinePath` + `strokeDasharray`. Trivial in Visx.
- Tooltips -- `@visx/tooltip` with `useTooltip` hook. Show eGFR values for all 4 lines at the hovered x-position. One component, ~80 lines.
- Crosshair -- vertical `Line` element tracking mouse x via `localPoint`. ~20 lines.
- Hover states -- line `strokeWidth` bump on nearest trajectory. ~15 lines of logic in a `handleMouseMove` callback.

**Complexity estimate:** 2-3 days for the full interactive chart including tooltips, crosshair, hover states, responsive resize, and accessible data table. This is a medium-effort feature, not a risk item.

**Why no blockers:** Visx tooltip and crosshair are well-documented primitives. No external data fetching during interaction. No animation library needed. Single prediction response, single render.

---

## Component List Review (~12-15 in profile)

The Lean Launch Profile lists these components:

| Group | Components | Count |
|-------|-----------|-------|
| Form | PredictionForm, NumberInput (x4), NameInput, EmailInput | 3 unique |
| Chart | PredictionChart, TrajectoryLines, PhaseBands, DialysisThreshold, Tooltips, Crosshair | 6 |
| Results | ChartContainer, PDFDownloadButton, DisclaimerBlock | 3 |
| Layout | Header, Footer | 2 |
| Auth | MagicLinkForm, MagicLinkSent, VerifyHandler | 3 |
| **Total** | | **17** |

**Missing from the profile (I am adding):**
- `XAxis` + `YAxis` -- required subcomponents, not optional
- `StartPointLabel` + `EndPointLabels` -- client requirement for line labels
- `AccessibleDataTable` -- hidden screen-reader table, WCAG AA compliance
- `LoadingSkeleton` -- needed for results page loading state

Revised count: **~21 components.** Still a 50% reduction from the original ~40. This is fine. The profile's "12-15" estimate undercounts chart internals, but the actual build effort matches expectations.

**Removed from my original architecture (confirmed cut):**
- `OptionalFieldsSection`, `SilentFieldsSection`, `SexRadioGroup`, `VisitDatePicker` -- no optional fields, no sex, no dates
- `StatCardGrid`, `StatCard`, `UnlockPrompt`, `SlopeTag`, `SavePrompt` -- all deferred
- `ConfidenceTierBadge` -- single confidence level, no badge needed
- `AuthBanner` -- unnecessary with managed auth provider
- `account/` routes, `history/` page, middleware -- no accounts

---

## PDF Download Button Integration

The profile lists `POST /predict/pdf` as a server-side endpoint. My plan:

1. `PDFDownloadButton` sits below the chart inside `ChartContainer`.
2. On click, it sends the same prediction payload (or a prediction ID) to `POST /predict/pdf`.
3. Backend generates the PDF (server-side -- John's decision on approach).
4. Frontend receives the PDF blob, triggers `URL.createObjectURL()` + anchor download.
5. No client-side PDF generation needed. No html2canvas, no jspdf.

This is the cleanest approach. The button is a single component with a loading spinner and error state. One TanStack Query mutation. Half a day of work.

**One concern for John:** The PDF endpoint needs to reproduce the chart server-side. If the backend uses something like Puppeteer/Playwright to render the React chart, that is heavier infra. If it uses a Python plotting lib (matplotlib, reportlab), the chart will look different from the web version. This needs alignment before sprint starts.

---

## Summary

| Item | Verdict |
|------|---------|
| Visx Variant A (tooltips, crosshair, hover) | FEASIBLE -- 2-3 days, no blockers |
| Component count | ~21, not 12-15. Still a major reduction. |
| PDF download | Clean integration via server endpoint + blob download |
| Risk items | PDF chart fidelity (backend concern, not frontend) |
| File structure | Dropping `account/`, `history/`, middleware, 3 form sections |

I am ready to build. Waiting on CTO hosting decision and John's PDF approach.
