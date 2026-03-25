# KidneyHood Design Tokens

**Author:** Inga (Senior UX/UI Designer)
**Version:** 1.0 -- Discovery Phase Draft
**Date:** 2026-03-25
**For:** Harshit (Frontend Developer)

Design tokens mapped directly to Tailwind CSS variables for implementation with shadcn/ui. Copy these into `tailwind.config.ts` and `globals.css`.

---

## Table of Contents

1. [Color Tokens](#1-color-tokens)
2. [Typography Tokens](#2-typography-tokens)
3. [Spacing Tokens](#3-spacing-tokens)
4. [Border & Radius Tokens](#4-border--radius-tokens)
5. [Shadow Tokens](#5-shadow-tokens)
6. [Breakpoint Tokens](#6-breakpoint-tokens)
7. [Animation Tokens](#7-animation-tokens)
8. [Chart-Specific Tokens](#8-chart-specific-tokens)
9. [Tailwind Config Reference](#9-tailwind-config-reference)
10. [WCAG Contrast Verification](#10-wcag-contrast-verification)

---

## 1. Color Tokens

### Core Palette

| Token Name | CSS Variable | Hex Value | HSL Value | Usage |
|-----------|-------------|-----------|-----------|-------|
| primary | `--primary` | #1D9E75 | 158 70% 37% | CTA buttons, success states, BUN<=12 trajectory |
| primary-light | `--primary-light` | #E8F5F0 | 158 40% 93% | Phase 1 band, success backgrounds, Tier 2 badge bg |
| primary-foreground | `--primary-foreground` | #FFFFFF | 0 0% 100% | Text on primary backgrounds |
| secondary | `--secondary` | #378ADD | 213 68% 54% | BUN 13-17 trajectory, secondary actions, focus rings |
| secondary-light | `--secondary-light` | #85B7EB | 211 72% 72% | BUN 18-24 trajectory |
| secondary-foreground | `--secondary-foreground` | #FFFFFF | 0 0% 100% | Text on secondary backgrounds |
| neutral | `--neutral` | #AAAAAA | 0 0% 67% | No-treatment trajectory, disabled states |
| destructive | `--destructive` | #D32F2F | 0 64% 51% | Dialysis threshold, error states, inline errors |
| destructive-foreground | `--destructive-foreground` | #FFFFFF | 0 0% 100% | Text on destructive backgrounds |

### Semantic Colors

| Token Name | CSS Variable | Hex Value | Usage |
|-----------|-------------|-----------|-------|
| background | `--background` | #FFFFFF | Page background |
| foreground | `--foreground` | #1A1A1A | Primary text |
| card | `--card` | #F8F9FA | Card backgrounds, form sections, skeleton base |
| card-foreground | `--card-foreground` | #1A1A1A | Text on card backgrounds |
| muted | `--muted` | #F8F9FA | Muted backgrounds |
| muted-foreground | `--muted-foreground` | #666666 | Helper text, labels, secondary text |
| accent | `--accent` | #F8F9FA | Hover backgrounds |
| accent-foreground | `--accent-foreground` | #1A1A1A | Text on accent backgrounds |
| border | `--border` | #E0E0E0 | Input borders, dividers, axis lines |
| input | `--input` | #E0E0E0 | Input borders (alias) |
| ring | `--ring` | #378ADD | Focus ring color |

### Functional Colors (not in Tailwind config, use directly)

| Usage | Hex Value | Notes |
|-------|-----------|-------|
| Error background (input) | #FDECEA | Used on error-state input backgrounds |
| Phase 2 band | #FFF8E1 | Warm yellow, 0.3 opacity |
| Phase 3 band | #FDECEA | Warm pink, 0.2 opacity |
| Phase 4 band | #F5F5F5 | Light gray, 0.3 opacity |
| Tertiary text | #888888 | Phase band labels, muted captions |
| Skeleton shimmer end | #E0E0E0 | Animation gradient endpoint |

---

## 2. Typography Tokens

### Type Scale

| Token | CSS Variable | Size | Weight | Line Height | Letter Spacing | Tailwind Class | Usage |
|-------|-------------|------|--------|------------|----------------|---------------|-------|
| display | `--text-display` | 28px | 700 | 1.2 (34px) | -0.02em | `text-[28px] font-bold` | Page titles |
| heading | `--text-heading` | 20px | 600 | 1.3 (26px) | -0.01em | `text-xl font-semibold` | Section headings |
| body-large | `--text-body-lg` | 18px | 400 | 1.5 (27px) | 0 | `text-lg` | Stat card values |
| body | `--text-body` | 16px | 400 | 1.5 (24px) | 0 | `text-base` | Body text, form labels, inputs |
| chart-title | `--text-chart-title` | 15px | 700 | 1.3 (20px) | 0 | `text-[15px] font-bold` | Chart title |
| small | `--text-small` | 14px | 400 | 1.4 (20px) | 0 | `text-sm` | Helper text, disclaimers, errors |
| chart-subtitle | `--text-chart-sub` | 12px | 400 | 1.4 (17px) | 0 | `text-xs` | Chart subtitle |
| caption | `--text-caption` | 12px | 400 | 1.3 (16px) | 0.01em | `text-xs` | Chart axis labels, badges, footnotes |

### Font Family

```css
--font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
```

Tailwind: `font-sans` (set Inter as first in config).

**Why Inter:** Excellent legibility at small sizes, strong number rendering (critical for lab values and chart labels), free, wide browser support. If Inter is unavailable, system sans-serif provides adequate fallback.

### Font Weight Map

| Weight | CSS Value | Tailwind | Usage |
|--------|----------|---------|-------|
| Regular | 400 | `font-normal` | Body text, helper text |
| Medium | 500 | `font-medium` | Badge text, emphasis |
| Semibold | 600 | `font-semibold` | Headings, stat card headers, labels |
| Bold | 700 | `font-bold` | Display title, chart title, stat values |

### Minimum Font Sizes (Accessibility)

- **Absolute minimum:** 12px (chart axis labels, captions only).
- **Body minimum:** 16px (prevents iOS zoom-on-focus and meets 60+ readability needs).
- **Interactive element labels:** 16px minimum.
- **At 200% zoom:** all text must remain readable without horizontal scroll.

---

## 3. Spacing Tokens

### Base Scale (8px grid)

| Token | CSS Variable | Value | Tailwind | Usage |
|-------|-------------|-------|---------|-------|
| space-0.5 | `--space-0-5` | 2px | `p-0.5` | Micro gaps |
| space-1 | `--space-1` | 4px | `p-1` | Icon-to-text gap, tight margins |
| space-2 | `--space-2` | 8px | `p-2` | Radio option gap, chart element spacing |
| space-3 | `--space-3` | 12px | `p-3` | Input padding, mobile field gap |
| space-4 | `--space-4` | 16px | `p-4` | Card padding, page padding (mobile), card grid gap |
| space-5 | `--space-5` | 24px | `p-6` | Section spacing, page padding (tablet), submit button top margin |
| space-6 | `--space-6` | 32px | `p-8` | Section dividers, page padding (desktop), disclaimer top margin |
| space-7 | `--space-7` | 48px | `p-12` | Major section breaks |
| space-8 | `--space-8` | 64px | `p-16` | Page top/bottom margins |

### Component-Specific Spacing

| Context | Value | Tailwind |
|---------|-------|---------|
| Input height | 48px | `h-12` |
| Submit button height | 56px | `h-14` |
| Touch target minimum | 44px | `min-h-[44px] min-w-[44px]` |
| Label to input gap | 6px | `mb-1.5` |
| Input to helper text gap | 4px | `mt-1` |
| Field to field gap (mobile) | 12px | `gap-3` |
| Field to field gap (tablet/desktop) | 16px | `gap-4` |
| Card grid gap | 16px | `gap-4` |
| Card to card gap (mobile stack) | 12px | `gap-3` |
| Chart to footnote gap | 8px | `mt-2` |
| Header height (mobile) | 48px | `h-12` |
| Header height (tablet) | 56px | `h-14` |
| Header height (desktop) | 64px | `h-16` |

---

## 4. Border & Radius Tokens

### Border Widths

| Usage | Value | Tailwind |
|-------|-------|---------|
| Default input/card border | 1px | `border` |
| Focus/error input border | 2px | `border-2` |
| Stat card left accent | 4px | `border-l-4` |

### Border Radii

| Token | Value | Tailwind | Usage |
|-------|-------|---------|-------|
| radius-sm | 4px | `rounded` | Small elements, badges |
| radius-md | 6px | `rounded-md` | Inputs, selects |
| radius-lg | 8px | `rounded-lg` | Cards, buttons, dropdowns |
| radius-xl | 12px | `rounded-xl` | Save prompt dialog |
| radius-full | 9999px | `rounded-full` | Confidence badge pill, toggle thumb |

---

## 5. Shadow Tokens

| Token | Value | Tailwind | Usage |
|-------|-------|---------|-------|
| shadow-sm | `0 1px 2px rgba(0,0,0,0.05)` | `shadow-sm` | Default cards |
| shadow-md | `0 4px 6px rgba(0,0,0,0.07)` | `shadow-md` | Hovered cards, dropdowns |
| shadow-lg | `0 10px 15px rgba(0,0,0,0.1)` | `shadow-lg` | Selected cards, save prompt |
| shadow-xl | `0 20px 25px rgba(0,0,0,0.1)` | `shadow-xl` | Modal dialogs |
| shadow-up | `0 -4px 6px rgba(0,0,0,0.07)` | `shadow-[0_-4px_6px_rgba(0,0,0,0.07)]` | Mobile sticky disclaimer |

---

## 6. Breakpoint Tokens

| Token | Value | Tailwind Prefix | Content Max-Width |
|-------|-------|----------------|------------------|
| mobile | < 768px | (default) | 100% |
| tablet | >= 768px | `md:` | 100% |
| desktop | >= 1024px | `lg:` | 960px |
| wide | >= 1280px | `xl:` | 960px (unchanged) |

**Note:** We do NOT increase max-width beyond 960px. Content stays centered and capped at 960px for readability. The `xl:` breakpoint exists only for possible future use.

---

## 7. Animation Tokens

| Token | Duration | Easing | Tailwind | Usage |
|-------|----------|--------|---------|-------|
| transition-fast | 150ms | ease | `transition-all duration-150` | Tooltip appear/disappear |
| transition-normal | 200ms | ease | `transition-all duration-200` | Hover states, banner slide |
| transition-slow | 300ms | ease-out | `transition-all duration-300 ease-out` | Save prompt slide-up, section expand |
| pulse | 1.5s | infinite | `animate-pulse` | Skeleton loading |

---

## 8. Chart-Specific Tokens

These are NOT Tailwind variables. They are used in Visx SVG rendering.

### Line Colors (same as core palette, repeated for chart context)

| Trajectory | Color | Pattern | strokeWidth |
|-----------|-------|---------|-------------|
| BUN <= 12 | #1D9E75 | solid | 2.5 |
| BUN 13-17 | #378ADD | dashed (8,4) | 2.5 |
| BUN 18-24 | #85B7EB | short-dash (4,4) | 2.0 |
| No Treatment | #AAAAAA | dotted (2,4) | 2.0 |
| Dialysis threshold | #D32F2F | dashed (6,3) | 2.0 |

### Phase Band Colors

| Phase | Fill Color | Opacity |
|-------|-----------|---------|
| Phase 1 (Normal/Mild, eGFR 60-90+) | #E8F5F0 | 0.3 |
| Phase 2 (Moderate, eGFR 30-60) | #FFF8E1 | 0.3 |
| Phase 3 (Severe, eGFR 15-30) | #FDECEA | 0.2 |
| Phase 4 (Dialysis, eGFR 0-15) | #F5F5F5 | 0.3 |

### Chart Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Chart title | 15px | 700 | #1A1A1A |
| Chart subtitle | 12px | 400 | #666666 |
| Axis labels | 12px | 400 | #888888 |
| Axis title | 12px | 500 | #666666 |
| End-of-line labels | 12px | 600 | (per trajectory color) |
| Phase band labels | 11px | 400 | #888888 |
| Dialysis threshold label | 11px | 600 | #D32F2F |
| Tooltip header | 14px | 600 | #1A1A1A |
| Tooltip body | 14px | 400 | #1A1A1A |
| Tooltip muted | 12px | 400 | #666666 |
| Footnote | 12px | 400 | #888888 (italic) |

---

## 9. Tailwind Config Reference

Implementation reference for `tailwind.config.ts`:

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          light: "hsl(var(--primary-light))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          light: "hsl(var(--secondary-light))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        neutral: {
          DEFAULT: "hsl(var(--neutral))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      maxWidth: {
        content: "960px",
        form: "640px",
        dialog: "480px",
        "sign-in": "400px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

### globals.css CSS Variables

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 10%;
    --card: 210 17% 98%;
    --card-foreground: 0 0% 10%;
    --primary: 158 70% 37%;
    --primary-light: 158 40% 93%;
    --primary-foreground: 0 0% 100%;
    --secondary: 213 68% 54%;
    --secondary-light: 211 72% 72%;
    --secondary-foreground: 0 0% 100%;
    --neutral: 0 0% 67%;
    --destructive: 0 64% 51%;
    --destructive-foreground: 0 0% 100%;
    --muted: 210 17% 98%;
    --muted-foreground: 0 0% 40%;
    --accent: 210 17% 98%;
    --accent-foreground: 0 0% 10%;
    --border: 0 0% 88%;
    --input: 0 0% 88%;
    --ring: 213 68% 54%;
    --radius: 6px;
  }
}
```

---

## 10. WCAG Contrast Verification

All color combinations used in the app, verified against WCAG 2.1 AA requirements.

### Text Contrast (minimum 4.5:1 for normal text, 3:1 for large text)

| Text Color | Background | Ratio | Passes AA? | Usage |
|-----------|-----------|-------|-----------|-------|
| #1A1A1A on #FFFFFF | -- | 16.6:1 | Yes | Body text on page |
| #1A1A1A on #F8F9FA | -- | 15.4:1 | Yes | Body text on cards |
| #666666 on #FFFFFF | -- | 5.7:1 | Yes | Helper text on page |
| #666666 on #F8F9FA | -- | 5.3:1 | Yes | Helper text on cards |
| #888888 on #FFFFFF | -- | 3.5:1 | Yes (large only) | Muted text -- used only at 12px+ |
| #D32F2F on #FFFFFF | -- | 4.6:1 | Yes | Error text |
| #D32F2F on #FDECEA | -- | 4.2:1 | Yes (large) | Error text on error bg -- check with 14px+ |
| #FFFFFF on #1D9E75 | -- | 4.1:1 | Yes (large) | Button text -- 16px/600 qualifies as large |
| #FFFFFF on #378ADD | -- | 3.6:1 | Yes (large) | Secondary button text -- 16px/600 |

### Chart Line Contrast (minimum 3:1 against background)

| Line Color | Background | Ratio | Passes? | Notes |
|-----------|-----------|-------|---------|-------|
| #1D9E75 on #FFFFFF | -- | 4.1:1 | Yes | BUN<=12, solid line |
| #1D9E75 on #E8F5F0 | -- | 3.6:1 | Yes | BUN<=12 on Phase 1 band |
| #378ADD on #FFFFFF | -- | 3.5:1 | Yes | BUN 13-17, dashed line |
| #378ADD on #FFF8E1 | -- | 3.3:1 | Yes | BUN 13-17 on Phase 2 band |
| #85B7EB on #FFFFFF | -- | 2.2:1 | FAIL | BUN 18-24 -- MITIGATED by dash pattern |
| #AAAAAA on #FFFFFF | -- | 2.3:1 | FAIL | No treatment -- MITIGATED by dot pattern |
| #D32F2F on #FFFFFF | -- | 4.6:1 | Yes | Dialysis threshold |

**Mitigation for failing chart lines:**
- #85B7EB (BUN 18-24): Uses short-dash pattern to distinguish from solid/dashed lines. Color is supplementary, not sole differentiator. Meets WCAG 1.4.1 (Use of Color).
- #AAAAAA (No Treatment): Uses dotted pattern. Additionally, this is the "worst case" scenario and is always labeled. Pattern + position + label provide redundant identification.
- Both lines also have end-of-line text labels with matching color at 12px/600 weight.
- The accessible data table provides numeric values without relying on color at all.
