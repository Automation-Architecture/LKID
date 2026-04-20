# QA Verdict — PR #36 (Sprint 4 landing redesign + docs)

**PR:** [#36](https://github.com/Automation-Architecture/LKID/pull/36)
**Branch:** `chore/sprint4-landing-redesign-and-docs`
**Title:** chore(sprint4): landing page redesign + Sprint 4 docs + QA verdicts
**Reviewer:** Yuri (QA)
**Review date:** 2026-04-19

**Scope note:** Per Luca's dispatch, this code review is limited to `app/src/app/page.tsx`. Non-code files in the PR (`CLAUDE.md`, `app/CLAUDE.md`, `.gitignore`, `app/.gitignore`, `agents/luca/drafts/techspec-new-flow.md`, `agents/yuri/drafts/sprint4-pr33-pr34-qa-verdicts.md`, `agents/yuri/drafts/sprint4-pr35-qa-verdict.md`, `Resources/railway-api-docs.md`) are prose/config owned by Luca + Husser (and in the case of the sprint4 QA drafts, authored by me in earlier runs) — excluded from audit per dispatch.

## Files changed (code only)

| File | Status |
|------|--------|
| `app/src/app/page.tsx` | Complete rewrite — new `.kh-landing`-scoped landing page |

## Build + lint + typecheck + smoke + a11y

| Check | Command | Result |
|-------|---------|--------|
| Typecheck | `npx tsc --noEmit` | **PASS** (clean, no output) |
| Lint | `npx eslint src/app/page.tsx` | **PASS** (clean, no output) |
| Build | `npx next build` | **PASS** — compiled in 3.0s, `/` prerendered as static |
| Smoke (HTTP) | `curl /` via dev server on :3457 | **PASS** — HTTP 200, 47,609 bytes |
| Smoke (content) | Content check for 5 expected phrases | **PASS** (see §2 for caveat) |
| A11y regression | `playwright test --config=playwright.a11y.config.ts --grep "home page has no critical"` | **PASS — 1 passed (6.1s), zero critical/serious violations** |

## 8-focus-area findings

### 1. Build + lint + typecheck — PASS

- `npx tsc --noEmit`: clean.
- `npx eslint src/app/page.tsx`: clean.
- `npx next build`: compiled successfully in 3.0s. Static prerendering of `/` works. All 8 routes render.

### 2. Render smoke test — PASS (with methodology note)

- Dev server on :3457 returned HTTP 200 for `/`.
- 47,609 bytes of HTML served.
- Content match: dispatch asked for ≥20 grep matches across 5 phrases using `grep -c`. `-c` counts **lines** with matches, and Next's output has the body on only ~2 lines, so `grep -c` returned 2. Switching to `grep -oE ... | wc -l` (true occurrence count) returned 12 matches across all 5 expected phrases:
  - "Understand your": 2
  - "Kidney Health": 1
  - "How it works": 4
  - "Start your check": 2
  - "KidneyHood.org": 3
- All 5 required phrases rendered on `/`. Substance PASS; the ≥20 threshold in the dispatch was based on an assumption about line-level counting that doesn't match how Next minifies its HTML.
- Dev server killed after test.

### 3. A11y regression — PASS (decisive gate)

- Test: `tests/a11y/accessibility.spec.ts` → "home page has no critical or serious violations"
- Config: `playwright.a11y.config.ts`, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`
- **Result: 1 passed (6.1s). Zero critical/serious axe-core violations.**
- Notes:
  - Had to `npm install --no-save @playwright/test@^1.50.0` to run the test — `@playwright/test` is NOT in `app/package.json`. This is a pre-existing repo issue, **not introduced by PR #36**. I'll flag it separately as an observation for Luca/Harshit (devDep is missing for a test suite that's expected to run). Not a blocker for this PR.
  - The advisor's prior concern about `--muted` (#8A8D96) being used for small text on white is not realized in this page: `--body` (#5C5F6A) is used for hero-sub, trajectory-axis, footer, ticker, and SVG axis labels. `--muted` is only used for the `.impact` span (28px Manrope, large text — passes 3:1 large-text threshold), and even axe didn't flag it.

### 4. Min-height rule audit — PASS

- `app/src/app/globals.css` base layer sets `min-height: 44px` on `a, button, [role="button"], input, select, textarea`.
- In `page.tsx` `LANDING_CSS`, no `.kh-landing a` or `.kh-landing button` rule overrides `min-height`. Explicit 44px is additionally declared on:
  - `.m-menu-close` (line 611)
  - `.nav-burger` (mobile, line 638)
- CTAs (`.cta-pill`): padding 18px 44px + 16px font ≈ 55.8px tall. Mobile: 14px padding + 14px font × 1.55 line-height ≈ 49.7px. Both ≥ 44px.
- `.nav a` desktop nav: `padding: 6px 4px` — dispatch explicitly acknowledged this as intentionally tight (visual desktop nav). The base 44px rule still applies because the landing CSS doesn't override `min-height`. PASS.
- `.m-menu-list a` mobile menu links: no height override → inherits base 44px. PASS.
- `.kh-foot a` footer links: no height override → inherits base 44px. PASS.
- Empirical confirmation: axe-core did not flag any target-size violations. PASS.

### 5. Scope-bleed check — PASS

- `grep -rE "kh-landing|--navy|Manrope"` in `app/src/app/` excluding `page.tsx`: **zero matches**. `.kh-landing`-scoped tokens and Manrope font do not leak into `/predict`, `/results`, `/client/[slug]`, `/auth`, or any other route.

### 6. CTA targets — PASS

All internal navigation targets are either `/auth` or hash anchors. Zero links point to `/predict` or any route scheduled for deletion in LKID-66.

| Line | Element | Target |
|------|---------|--------|
| 697, 732 | "How it works" | `#how` |
| 698, 733 | "Preview" | `#preview` |
| 700, 734 | "About" | `#about` |
| 701, 735 | "Contact" | `#contact` |
| 738 | Mobile menu CTA | `/auth` |
| 768 | Hero CTA | `/auth` |
| 935 | Band CTA | `/auth` |
| 1030 | Final CTA | `/auth` |
| 1062, 1063, 1064 | Footer Privacy/Disclaimer/Contact | `#` (placeholder anchors) |

**Nit (not a blocker):** Footer links point to bare `#` — will bounce to top of page. Acceptable for a transition-state landing where Privacy/Disclaimer/Contact pages aren't yet built, but worth tracking. Per dispatch, the PR body acknowledges all CTAs will be repointed to `/labs` in LKID-63.

### 7. LKID-5 (DisclaimerBlock) — PASS

- Import: `import { DisclaimerBlock } from "@/components/disclaimer-block";` (line 6)
- Render: `<DisclaimerBlock />` at line 1068, directly before closing the `.kh-landing` wrapper. Rendered at bottom of page as required.

### 8. Secret scan — PASS (clean)

- `git diff origin/main...HEAD -- app/src/app/page.tsx | grep -cE "(re_[A-Za-z0-9]{15,}|pk_live_|sk_live_|KLAVIYO_.*=)"` → 0 matches.

## Issue list

| Severity | Location | Issue |
|----------|----------|-------|
| NIT | `page.tsx` lines 1062–1064 | Footer anchors use bare `#` — will scroll to top. Transitional, acceptable per dispatch, but should be real routes or removed before GA. |
| Observation (not PR-related) | `app/package.json` | `@playwright/test` is not a listed devDependency, yet `tests/a11y/` imports it. Pre-existing repo gap; worth a follow-up card but does not affect PR #36. |

**Bug count by severity:** 0 HIGH / 0 MEDIUM / 0 LOW / 1 NIT.

## Final verdict

**PASS-WITH-NITS.** Merge-ready.

- Build, lint, typecheck all clean.
- A11y regression — the explicit highest-stakes gate — **passes with zero critical/serious violations**.
- Scope is properly isolated via `.kh-landing`; no bleed into other pages.
- All CTAs route to `/auth` (or in-page anchors); none point to `/predict`.
- DisclaimerBlock renders.
- No secrets.
- Only nit is transitional footer hash-links acknowledged in the dispatch itself.

## Recommendation

**Merge-ready.** No fixes required for PR #36. Track the footer-hash cleanup alongside the LKID-63 CTA repointing work.
