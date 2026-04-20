# LKID-67: Chart color re-tokening — design decision

**Author:** Inga (UX/UI Designer)
**Date:** 2026-04-19
**For:** LKID-67 (second half) — SVG-internal chart colors
**Harshit's first half:** merged in PR #48 (HTML text re-tokening to `text-foreground` / `text-muted-foreground`)
**Acceptance criteria:** https://automationarchitecture.atlassian.net/browse/LKID-67

---

## Summary

Five hex values inside the `<svg>` element of `EgfrChart.tsx` failed WCAG AA 4.5:1 contrast on the white chart background. All five are re-tokened. The four trajectory colors are reorganized into a four-hue semantic palette — emerald (best) → sky (neutral) → amber (caution) → slate (muted/ignored) — because the original monochromatic blue/green gradient could not carry the "do nothing" signal without reading green → light blue → lighter blue → gray, which is both semantically weak and contrast-failing. Phase-band labels move to a single slate-600.

No Treatment is charcoal, **not red** — deliberately avoiding a dual-red clash with the existing `#D32F2F` dialysis-threshold line inside the same chart (see §4).

## Before / after

All contrast ratios measured against `#FFFFFF` (chart background).

| Location | Before | Ratio | After | Ratio | Name |
|---|---|---|---|---|---|
| `transform.ts` — BUN ≤ 12 trajectory | `#1D9E75` | 3.39:1 ❌ | **`#047857`** | **5.48:1** ✅ | emerald-700 |
| `transform.ts` — BUN 13–17 trajectory | `#378ADD` | 3.59:1 ❌ | **`#0369A1`** | **5.93:1** ✅ | sky-700 |
| `transform.ts` — BUN 18–24 trajectory | `#85B7EB` | 2.11:1 ❌ | **`#B45309`** | **5.02:1** ✅ | amber-700 |
| `transform.ts` — No Treatment trajectory | `#AAAAAA` | 2.32:1 ❌ | **`#374151`** | **10.31:1** ✅ | slate-700 |
| `EgfrChart.tsx:345` — Phase labels | `#888888` | 3.54:1 ❌ | **`#475569`** | **7.58:1** ✅ | slate-600 |

### Inherit-by-reference (auto-fixed by the four `transform.ts` changes)

| Location | Prior value | New value | Ratio on white |
|---|---|---|---|
| `EgfrChart.tsx:477` — End-of-line trajectory labels | `fill={traj.color}` | (inherits all four above) | 5.02 – 10.31:1 ✅ |
| `EgfrChart.tsx:706` — Stat-card 10×10 dot swatches (`aria-hidden`) | `background: traj.color` | (inherits all four above) | visual only — decorative |

### Tier-1 confidence badge (`EgfrChart.tsx:558, 567`)

| Element | Before | After | Ratio |
|---|---|---|---|
| Stroke on `#E8F5F0` pill fill | `#1D9E75` | `#047857` | 3.01:1 → 4.90:1 on pill; 3.39:1 → 5.48:1 on page white |
| Text (10px/600) on `#E8F5F0` pill fill | `#1D9E75` | `#047857` | 3.02:1 → **4.90:1** ✅ |

The Tier-1 badge is `aria-hidden="true"`, so axe does not flag it — but the change keeps the "Tier 1 = rigorous BUN control = emerald-700" semantic chain intact and improves contrast regardless.

## Option chosen: **B — semantic color story (revised)**

Rejected A (monochromatic dark blues): poor signal for "worst path." Rejected C (darkened greens/blues only): preserves brand feel but loses the "danger/ignored" visual signal for No Treatment — charts for an older-adult CKD audience need the outcome to read on first glance.

Chose B but with **charcoal** instead of red for No Treatment:

- **Emerald-700** (`#047857`) — BUN ≤ 12 — "the best path you can take." Retains green = growth/recovery.
- **Sky-700** (`#0369A1`) — BUN 13–17 — neutral, cool, competent. Brand-adjacent to the existing `#1F2577` navy.
- **Amber-700** (`#B45309`) — BUN 18–24 — the first signal that you are starting to lose ground. Matches the Tier-2 badge amber already in use (`#92400E`), reinforcing internal cohesion.
- **Slate-700** (`#374151`) — No Treatment — muted, ignored, fading. Preserves the *semantic intent* of the original `#AAAAAA` ("absent / doing nothing") but at 10.3:1 contrast.

This is a deliberate shift from a 2-hue monochrome palette to a 4-hue semantic palette. **Brand-calm trade-off acknowledged** (§3). For an older-adult lead-gen flow where the user sees the chart for 30–60 seconds, semantic legibility wins over clinical monochrome.

## Why not red for No Treatment?

The chart already contains **`#D32F2F` as the dialysis-threshold horizontal line** (`EgfrChart.tsx:374, 386`). Coloring No Treatment red (e.g., `#B91C1C` red-700) would produce two red visual elements on the same axis — one horizontal (threshold), one curving toward it (the ignored trajectory). Two readings of that:

1. Cohesive: "ignoring treatment takes you to the red line." ✅
2. Confusing: the trajectory line visually merges with / becomes the threshold — the crossing point loses its meaning. ❌

Given (2) is a real failure mode for a one-screen chart read by lay users, charcoal is the safer call. Charcoal is also the honest answer to "what does No Treatment mean visually?" — not "panic," just **"faded, neglected, unattended"** — which is actually the clinical message we want. Red would overclaim.

## Colorblind safety (deuteranopia / protanopia)

The four trajectories are **distinguishable** under red-green color deficiency but **not on hue alone** — that's true for any color-coded chart, and why our design redundantly encodes each trajectory with:

1. **Color** (emerald / sky / amber / slate)
2. **Stroke pattern** (solid, 8-4 dash, 4-4 short-dash, 2-4 dot)
3. **Line weight** (2.5 / 2.5 / 2.0 / 2.0)
4. **End-of-line numeric labels** (same color + ~60pt bold)
5. **Stat card with written label** ("BUN ≤ 12" etc.) below the chart
6. **Accessible `<table>` fallback** (SR-only, not gated by color at all)

This satisfies WCAG 1.4.1 (Use of Color) — color is **never** the sole indicator of trajectory identity.

Luminance ordering (no dimension: best → worst):

| Trajectory | Color | Luminance (Y) |
|---|---|---|
| BUN 13–17 | sky-700 | 0.127 |
| BUN ≤ 12 | emerald-700 | 0.142 |
| BUN 18–24 | amber-700 | 0.159 |
| No Treatment | slate-700 | **0.052** |

No Treatment is **clearly the darkest** under any color-vision filter (~2.4× darker than the others). That anchors the "ignored / worst outcome" visual read without relying on hue. The three BUN trajectories have similar luminance, which is why dash patterns carry the differentiation load for them. This is an honest description — I am not claiming strong luminance separation between the three BUN lines.

## Brand fit

KidneyHood's brand palette (from `app/src/app/globals.css` and `design-tokens.md`):

- Brand primary: `#1D9E75` (kidney-green)
- Brand secondary: `#378ADD` (sky-blue)
- Dashboard navy: `#1F2577`

The new trajectory palette pulls darker cousins of the existing brand hues (emerald is a darker green; sky-700 is a darker blue than `#378ADD`; the navy dashboard already uses very dark blue). Amber is the one new hue family, and it is brand-adjacent via the Tier-2 confidence badge (`#92400E`) already in use since Sprint 2. Slate is neutral — complements all brand colors without competing.

**The chart will feel more saturated and more "clinical"** than the prior pastel-blue cascade. This is the deliberate trade — semantic clarity up, airy-calm down. The original design was pretty; it was not legible to an older user with reduced contrast sensitivity.

## Lee sign-off

> **Flag to Lee:** the prior emerald/sky/pale-blue/gray palette has been in his client dashboard for ~4 weeks. The change to emerald / sky / amber / charcoal is substantive enough that he should see it before the next review cycle. Luca: please include a before/after screenshot in the next Lee update; I can provide one from the dev server or from the merged PR's Vercel preview.

Specific items for Lee to confirm:

1. The four new trajectory colors tell the right clinical story (best → neutral → caution → ignored).
2. Amber for BUN 18–24 is acceptable (new hue to the palette; not an alarm signal — "caution, borderline").
3. Charcoal (not red) for No Treatment is acceptable — rationale is avoiding dual-red clash with the existing `#D32F2F` dialysis-threshold line.
4. No semantic color meaning is reversed from his clinical view of BUN control.

## Files modified

- `app/src/components/chart/transform.ts` — 4 hex values in `TRAJECTORY_CONFIG`, explanatory comment added.
- `app/src/components/chart/EgfrChart.tsx` — 3 hex values (phase label `fill`, Tier-1 badge stroke, Tier-1 badge text), explanatory comments added.

End-of-line labels (line 477) and stat-card swatches (line 706) inherit from `TRAJECTORY_CONFIG.color` automatically — no edit needed.

## Follow-up flagged for Yuri (not this PR)

Harshit's PR #48 left `.exclude('[data-testid="egfr-chart-wrapper"]')` in `app/tests/a11y/accessibility.spec.ts:127`. With the SVG internals now AA-compliant, that wrapper exclusion is redundant — `.exclude("svg")` alone is sufficient (line 122). This widens axe coverage to include decorative elements outside the `<svg>` but inside the wrapper (if any exist). This is Yuri's call to make in LKID-65 territory; I have not changed the test config.
