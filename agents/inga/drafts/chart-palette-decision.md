# Chart Palette Decision — Results-page eGFR Trajectory

**Author:** Inga
**Date:** 2026-04-20
**Audience:** Harshit (frontend), Brad (sign-off)
**Status:** Final — ship these hex codes.

---

## SUPERSEDED 2026-04-20 — chart line palette reversed to design hues (Brad decision)

The decision below (Palette A+ hybrid for chart lines) is **superseded for chart trajectory lines only** as of 2026-04-20. Brad explicitly chose the brighter design hues (`#3FA35B / #1F2577 / #D4A017 / #6B6E78`) to match brand identity in `project/Results.html`, accepting the WCAG AA contrast regression on the yellow line (2.38:1 — fails 3:1 large-text).

Scope of supersession:
- Chart trajectory lines only
- Scenario pills, cards, icons, and text on the Results page continue to use the WCAG-compliant `--s-*-text` tokens from PR #57. Those are NOT reversed.
- Axe-core test on the chart SVG is re-excluded (LKID-67 reversal on SVG only; page chrome still audited)

Tracking: LKID-80. If this decision is ever reversed again, restore the pre-supersession state below.

---

## 1. Decision

**Palette A stays on the chart lines. Palette B stays on pills, cards, and legend icons.** This is not a hybrid compromise — it reflects the fact that WCAG AA constrains a 2px stroke on white much more tightly than it constrains a filled pill or a 20px icon. The two surfaces do not need to share hex codes to share meaning; they need to share **hue family**.

**One small adjustment inside Palette A:** swap the "Stable" line from sky-700 `#0369A1` → brand navy `#1F2577`. Brand navy passes contrast at 13.26:1 (well above AA), ties the chart directly to the pill `--s-blue`, and removes Palette A's weakest visual link. Call this **Palette A+**.

---

## 2. Contrast math (WCAG 2.1, sRGB, relative luminance against `#FFFFFF`)

Formula: `L = 0.2126·R_lin + 0.7152·G_lin + 0.0722·B_lin`; contrast vs. white = `1.05 / (L + 0.05)`.
Thresholds: **4.5:1** for normal text / value labels rendered in the line color; **3:1** for 2-px+ graphical objects (line strokes, icon fills).

### Palette A (current live, set in LKID-67)

| Token | Hex | vs. white | Line ≥3:1 | Label ≥4.5:1 |
|---|---|---|---|---|
| Healthy (BUN ≤12) | `#047857` | **5.48 : 1** | PASS | PASS |
| Stable (BUN 13–17) | `#0369A1` | **5.93 : 1** | PASS | PASS |
| Higher risk (BUN 18–24) | `#B45309` | **5.02 : 1** | PASS | PASS |
| No treatment | `#374151` | **10.31 : 1** | PASS | PASS |

All four trajectories pass both thresholds. Values match `app/src/components/chart/transform.ts:26–46` and `agents/inga/drafts/lkid-67-chart-color-decision.md:23–26`.

### Palette B (finalized design source, `project/Results.html:24–33`)

| Token | Hex | vs. white | Line ≥3:1 | Label ≥4.5:1 |
|---|---|---|---|---|
| `--s-green` (healthy) | `#3FA35B` | **3.14 : 1** | PASS (barely) | **FAIL** |
| `--s-blue` (stable) | `#1F2577` | **13.26 : 1** | PASS | PASS |
| `--s-yellow` bright | `#D4A017` | **2.38 : 1** | **FAIL** | **FAIL** |
| `--s-yellow` darker alt | `#B68810` | **3.22 : 1** | PASS (barely) | **FAIL** |
| `--s-gray` | `#6B6E78` | **5.08 : 1** | PASS | PASS |

The yellow is the decisive failure. `#D4A017` fails even the 3:1 graphical-object threshold, meaning it cannot legally render as a chart stroke on white under LKID-67's accessibility commitment. The darker `#B68810` scrapes past 3:1 but still fails as a text label — and the Results design explicitly renders end-point value callouts ("17" and "4" per `project/Results.html` / audit item in `agents/luca/drafts/ui-design-audit-sprint5.md:89`) in the line color. Those callouts are small text, so 4.5:1 is the right bar. Both yellows fail it.

Green `#3FA35B` at 3.14:1 also fails the label test, which matters because the "Healthy" trajectory has the most important end-point callout.

---

## 3. Visual-system consistency — hue family, not hex match

The audit worry was that mixing palettes breaks the pill ↔ line ↔ card ↔ heart-icon color chain. It doesn't, as long as each lane stays in the same hue family:

| Lane | Pill / card / icon (Palette B) | Chart line (Palette A+) | Same hue family? |
|---|---|---|---|
| Healthy | `#3FA35B` lime-green | `#047857` emerald-700 | Yes — both green |
| Stable | `#1F2577` brand navy | `#1F2577` brand navy | **Exact match** |
| Higher risk | `#B68810` / `#D4A017` gold | `#B45309` amber-700 | Yes — both warm gold/amber |
| No treatment | `#6B6E78` neutral gray | `#374151` slate-700 | Yes — both neutral dark-gray |

Users do not match hex codes across surfaces; they match hue + position + label. A darker-saturated emerald line leading into a lime-green scenario pill reads as "the green path." The Stable lane is now a pure match. The weakest old link (sky-700 vs. brand navy) disappears with the A+ swap.

---

## 4. Why a stricter "use B everywhere" hybrid fails

It fails on yellow, full stop. We cannot put a 2.38:1 or 3.22:1 yellow line on white and honor LKID-67 or the axe-core config in `app/tests/a11y/accessibility.spec.ts`. It would regress the fix Brad already paid for and break CI.

Why not desaturate B's yellow into a WCAG-compliant gold? Because once we darken it to ~5:1 (the Palette-A equivalent), we are back at amber-700 territory — i.e., Palette A. There is no meaningful color between "B's airy gold" and "A's amber-700" that is both AA-compliant and visibly different from A. The compliant option *is* Palette A.

---

## 5. Instructions for Harshit

### 5a. Chart lines — edit `app/src/components/chart/transform.ts`

Change one line only:

```ts
// Line 32 — was: color: "#0369A1",
bun_13_17: {
  id: "bun_13_17" as TrajectoryId,
  label: "BUN 13–17",
  color: "#1F2577", // brand navy — 13.26:1 on white, matches --s-blue
  strokeDasharray: "8,4",
  strokeWidth: 2.5,
},
```

Leave `bun_lte_12` (`#047857`), `bun_18_24` (`#B45309`), `no_treatment` (`#374151`) untouched. Update the comment block at lines 15–21 to note the sky-700 → brand-navy swap and the rationale (brand-token alignment with `--s-blue`). No schema / test changes required; contrast values in any test fixture stay true.

### 5b. Pills, scenario cards, legend heart icons — use Palette B tokens

Per audit P0 items `ui-design-audit-sprint5.md:79–80`, the pill row and scenario card tinted backgrounds are missing / broken on deployed Results. When you build those in per the P0 fix, use the Palette B CSS variables exactly as defined in `project/Results.html:24–35`:

- `--s-green: #3FA35B`, `--s-green-bg`, `--s-green-border` — "BUN ≤ 12" pill + scenario card
- `--s-blue: #1F2577`, `--s-blue-bg`, `--s-blue-border` — "BUN 13–17" pill + scenario card
- `--s-yellow: #B68810`, `--s-yellow-bg`, `--s-yellow-border` — "BUN 18–24" pill + scenario card (use `#B68810`, not `#D4A017`, for text/border strokes inside the pill; pass/near-pass)
- `--s-gray: #6B6E78`, `--s-gray-bg`, `--s-gray-border` — "No Treatment" pill + scenario card

Text *inside* these pills/cards must render in `var(--ink)` (`#0E0E12`) or navy, not in the fill color, to stay above 4.5:1 on the tint background. The colored hex above is for backgrounds, borders, and filled icon shapes (hearts, dots) — all of which are graphical objects, not text, so the 3:1 threshold applies and is met.

---

## 6. Migration notes

### Design-source sync (required)

`project/Results.html` currently implies the chart lines will use `--s-green / --s-blue / --s-yellow / --s-gray`. They will not. Update the Results.html chart block (and the PDF template, per audit item 20) to the A+ swatches:

```
Chart lines only (document as comment near line 33):
  --chart-healthy:   #047857
  --chart-stable:    #1F2577  /* same as --s-blue */
  --chart-risk:      #B45309
  --chart-untreated: #374151
```

Pills, cards, and icons keep their current `--s-*` values. This closes the "design source vs. deployed code" drift the audit flagged.

### QA re-test (light)

Palette A is already green across axe-core, so the only material change is `#0369A1 → #1F2577`. That color passes by a wider margin than the one it replaces (13.26:1 vs. 5.93:1), so no axe regression is possible on the chart SVG. Yuri should still:

1. Re-run `app/tests/a11y/accessibility.spec.ts` on the Results page.
2. Visually confirm the navy line is distinguishable from the `#1F2577` nav bar and the navy CTA pill — test on the deployed preview, not a dev server, because anti-aliasing differs.
3. Confirm the chart legend swatch for "Stable" reads as navy, not sky-blue, and matches the "BUN 13–17" scenario pill tint.

### Lee flag

The client dashboard has shown sky-700 for ~4 weeks (per `lkid-67-chart-color-decision.md:105`). The navy swap is a small change but it is the "Stable" line Lee talks about most. Luca: include a before/after in the next Lee update.

---

**TL;DR for Brad:**
Keep Palette A on the chart lines (swap sky-700 → brand navy `#1F2577` for Stable); use Palette B on pills/cards/icons. The single load-bearing reason: Palette B's yellow fails WCAG even at the lax 3:1 graphical-object threshold, so it cannot legally be a chart stroke — and the design's hue-family consistency is preserved without hex-matching.
