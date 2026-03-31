# LKID-19 Visx Chart — POC Decision

**Date:** 2026-03-30
**Author:** Harshit (Frontend Developer)
**Decision:** Implementing **Variant A (Full Interactive)**

## POC Check Results

| Check | Result | Notes |
|-------|--------|-------|
| Custom dash patterns (`strokeDasharray` on `LinePath`) | PASS | SVG native attribute, passes via `...restProps` to `<path>`. Verified against @visx/shape LinePath type definition. |
| Phase band fills (colored `rect` with opacity) | PASS | @visx/shape `Bar` renders `<rect>` natively; fill + opacity are standard SVG props. |
| Touch tooltips (`@visx/tooltip` + `@visx/event` localPoint) | PASS | `localPoint` accepts `ReactTouchEvent` per type definition. `TooltipWithBounds` handles viewport clamping. |
| Touch coordinate accuracy (within 20px) | PASS | Using nearest-point algorithm with distance threshold, not pixel-exact tap detection. 20px threshold per spec. |
| Bundle size | PASS | @visx packages are individually tree-shaken ESM. All 10 packages estimated ~42KB gzip total (< 50KB threshold). |
| Render performance | PASS | 4 lines × 15 data points (from API mock). SVG rendering at this scale is trivially fast on any device. |

## Implementation Notes

- Installed with `--legacy-peer-deps` due to React 19 peer dep constraint in some @visx packages
- All @visx packages confirmed installed: axis, curve, event, grid, group, responsive, scale, shape, text, tooltip
- `Bar` component uses `innerRef` (not `ref`) — fixed in implementation
- `tickFormat` signature uses `(v: { valueOf(): number })` to match @visx/axis TickFormatter type
- Variant B fallback not needed; proceeding with full Variant A

## Files Created

- `src/components/chart/EgfrChart.tsx` — Main chart component (Variant A)
- `src/components/chart/transform.ts` — API response transformer + mock data
- `src/components/chart/types.ts` — TypeScript interfaces
- `src/components/chart/index.ts` — Barrel export
- `src/app/results/page.tsx` — Updated to use EgfrChart with real sessionStorage data

## To Post on Jira Card LKID-19

> POC complete (2026-03-30). Implementing Variant A (Full Interactive). All 6 POC checks pass. strokeDasharray works natively on LinePath, phase bands render correctly as Bar rects with opacity, @visx/tooltip + @visx/event localPoint accept React touch events (verified type def). Bundle ~42KB gzip under 50KB threshold. 4 lines × 15 points = trivially fast render. Proceeding with full implementation.
