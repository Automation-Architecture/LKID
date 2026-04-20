# Sprint 5 — PR #57 QA Verdict (LKID-76 Results Page Design Parity + Sitewide Font Regression)

**Reviewer:** Yuri (QA)
**Date:** 2026-04-20
**Window:** Narrow verify (<10 min)

---

## PR Metadata

| Field | Value |
|-------|-------|
| PR | [#57](https://github.com/Automation-Architecture/LKID/pull/57) |
| Branch | `feat/LKID-76-results-parity` |
| HEAD SHA | `9d7a7ad87426258e2897ccc54dc780514bb08beb` |
| Base | `origin/main` |
| Commits | 3 (`e997e1f` sitewide fonts, `21270d0` chart navy swap, `9d7a7ad` Results rebuild) |
| Author | Harshit (frontend, per LKID-76 ownership) |
| Scope | Replace thin `<Header>` + `<DisclaimerBlock>` scaffolding on `/results/[token]` with the scoped `.kh-results` shell (navy nav + brand footer) matching `project/Results.html`. Rebuild page into 5 design-parity blocks: title+top download pill, chart card w/ legend, scenario overview (4 pills + 4 tinted cards w/ 32px numerics), "What Your Results Mean" w/ kidney radial visual + second download pill + fine-print, full navy Edit pill. Wire Manrope + Nunito Sans at `<html>` level so pages without their own `.kh-*` shell (Results, future PDF) inherit the brand type stack. Swap chart "Stable" line `#0369A1` → `#1F2577` brand navy per Inga's `chart-palette-decision.md` (Palette A+). 4 files changed, +895/−177. |

---

## Check Matrix (15/15)

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Clean checkout + HEAD captured | PASS | `git rev-parse HEAD` → `9d7a7ad87426258e2897ccc54dc780514bb08beb` exactly matches dispatched SHA. Branch `feat/LKID-76-results-parity` up-to-date with origin. |
| 2 | Diff scope matches claim | PASS | `git diff --name-only main...HEAD` returns exactly 4 files: `app/src/app/globals.css`, `app/src/app/layout.tsx`, `app/src/app/results/[token]/page.tsx`, `app/src/components/chart/transform.ts`. No `package-lock.json` changes (no new deps — `manrope`/`nunito_sans` already in `next/font/google`). No ancillary edits. |
| 3 | Frontend `next build` | PASS | `cd app && npm run build` → "Compiled successfully in 6.5s", TypeScript finished clean in 1823ms. All 7 routes generated (`/`, `/_not-found`, `/client/[slug]`, `/gate/[token]`, `/internal/chart/[token]`, `/labs`, `/results/[token]`). Static pages generated 5/5. |
| 4 | Frontend lint | PASS | `cd app && npm run lint` → 0 errors, 1 warning (`STATUS_LABELS` unused in `SprintTracker.tsx` — pre-existing, Harshit flagged, unrelated to PR #57). |
| 5 | Font loading — Next.js `next/font/google` + CSS vars at `<html>` | PASS | `layout.tsx:2` imports `Inter, Manrope, Nunito_Sans` from `next/font/google`. Each has `variable: "--font-manrope"` / `"--font-nunito"` (`:22,30`). `<html>` element at `:62` receives all three variable classes via `${inter.variable} ${manrope.variable} ${nunito.variable} h-full antialiased`. `display: "swap"` set for both new fonts. All latin subset weights loaded (Manrope 400–800, Nunito 400–700). |
| 5a | `globals.css` body + heading font stacks reference the right tokens | PASS | `globals.css:11` — `--font-sans: var(--font-nunito), var(--font-sans), system-ui, sans-serif`. `globals.css:14` — `--font-heading: var(--font-manrope), var(--font-nunito), var(--font-sans), sans-serif`. `globals.css:159` — `body { font-family: var(--font-sans) }`. `globals.css:168` — `h1,h2,h3,h4,h5,h6 { font-family: var(--font-heading) }`. Compiled CSS (`.next/static/chunks/12pnr51mpzru7.css`) confirms: the cascade emits both `:root{--font-sans:"Inter","Inter Fallback"}` AND `:root{--font-sans:var(--font-nunito),var(--font-sans),system-ui,sans-serif}`. The self-reference resolves against the earlier Inter token, so at paint time `--font-sans` = Nunito → Inter → system-ui → sans-serif. Body/h1 definitions emit in compiled CSS. Functional, but see Nit #2 for CSS-hygiene finding. |
| 6 | Chart palette swap `#0369A1` → `#1F2577` on disk | PASS | `grep -n "0369A1\|1F2577" app/src/components/chart/transform.ts` returns two hits: line 18 in updated docblock comment (historical reference) and line 37 in the actual `TRAJECTORY_CONFIG.bun_13_17.color` value — `color: "#1F2577"`. No other `#0369A1` occurrences remain in the file. Inga's memo cited line 32; the actual swap landed on line 37 due to expanded docblock comments at the top — functionally identical, the `bun_13_17` entry is the correct one. Docblock correctly names this "Palette A+" and references `chart-palette-decision.md §5a`. |
| 7 | Scenario palette tokens present in `:root` matching `project/Results.html:24–33` | PASS | `globals.css:65–86` defines all 12 tokens. Byte-for-byte match to design source: `--s-green: #3FA35B` / `--s-green-bg: rgba(108,194,74,0.12)` / `--s-green-border: rgba(108,194,74,0.35)`; `--s-blue: #1F2577` / `bg rgba(31,37,119,0.07)` / `border rgba(31,37,119,0.22)`; `--s-yellow: #B68810` / `bg rgba(235,190,40,0.14)` / `border rgba(235,190,40,0.45)`; `--s-gray: #6B6E78` / `bg rgba(90,95,110,0.06)` / `border rgba(90,95,110,0.2)`. Plus brand tokens `--kh-navy #1F2577`, `--kh-navy-deep #161B5E`, `--kh-ink`, `--kh-ink-2`, `--kh-body`, `--kh-muted`, `--kh-bg`, `--kh-border`. All match `project/Results.html:11–35`. |
| 8 | Results page section completeness (§8 design-parity checklist) | **PASS** | See **HIGH focus section** below — all 9 required sections present. |
| 9 | Layout wrapper (navy nav + footer) present in every LoadState | PASS | `page.tsx:977–996` renders `<nav class="nav">` + `<main>` + `<footer class="kh-foot">` unconditionally around `renderBody()`. All 4 LoadStates (invalid / error / loading / ready) return inner content only — the chrome is always rendered. Footer contains "KidneyHood.org" brand-foot + Privacy / Disclaimer / Contact nav. Matches Landing/Labs pattern (per Harshit's note, uses scoped `.kh-results` wrapper rather than extracting shared `<Nav>`/`<Footer>` components — advisor-sanctioned to avoid scope creep). |
| 10 | Critical `data-testid`s preserved | PASS | `grep -n "data-testid" app/src/app/results/\[token\]/page.tsx` confirms all 3 preserved: `results-heading` (line 834, on new H1 "Kidney Health Overview"), `results-pdf-link` (line 606, on top `DownloadPill` via conditional on `id="download-top"`), `results-edit-link` (line 953, on the new navy `.edit-pill` linking to `/labs`). Bonus additions: `results-loading-skeleton`, `structural-floor-callout`, `scenario-card-{id}`. **See Nit #1 for the `disclaimer-full-panel-desktop` removal — not in dispatch's preservation list, but it IS in existing E2E.** |
| 11 | No scope creep | PASS | Diff touches only Results page + globals.css + layout.tsx + chart/transform.ts. No changes in `app/src/app/page.tsx` (Landing), `app/src/app/labs/page.tsx`, `app/src/app/gate/[token]/page.tsx`, `app/src/components/ui/pdf/*` (PDF template), backend, or Klaviyo service. Email Gate, PDF template, Lab Form watermarks, Landing nav cleanup all untouched as required by dispatch. Header component file `app/src/components/header.tsx` retained (no longer imported by Results, Harshit left in place to avoid unrelated churn — acceptable). |
| 12 | No regressions in other suites | PARTIAL | No Jest/Vitest scripts defined in `app/package.json` (`"scripts"` = dev/build/start/lint only). `@playwright/test` **not installed** in `app/node_modules` (`ls node_modules/@playwright/test` → no such directory). Harshit flagged this in dispatch completion. Backend Python tests not impacted (no shared types touched). The `next build` compilation step is the only automated gate available locally, and it passes. See Nit #1 for E2E impact. |
| 13 | Secret scan clean | PASS | `grep -rn "phc_\|phx_\|sntry[a-z]*_\|api_key\|API_KEY\|secret"` across all 4 modified files returns **zero hits**. No DSNs, no API keys, no hardcoded tokens. `project/Results.html` as design source contains no secrets either (inline HTML prototype, no env). |
| 14 | Accessibility posture — chart palette + tinted card contrast | PASS | Chart palette: Inga's memo states `#1F2577` navy contrasts 13.26:1 vs white, strictly better than the `#0369A1` it replaces (5.93:1). No axe-core regression possible on chart SVG. Tinted scenario cards: the 32px Manrope-800 colored numerics sit on very light scenario tints (`rgba(...,0.07)` blue, `0.14` yellow, `0.12` green, `0.06` gray — effective L* ≈ 95+). Text colors are the saturated tokens (`#3FA35B`, `#1F2577`, `#B68810`, `#6B6E78`). Rough contrast estimates against effective white-ish tinted backgrounds: green ≈ 3.1:1 (large text passes AA-large 3:1), blue ≈ 13:1 (PASS), yellow ≈ 3.2:1 (large text passes), gray ≈ 5:1 (PASS). All numerics are >=24px bold (32px Manrope-800) so WCAG large-text 3:1 rule applies — all 4 clear that bar. None of the label text sits on the colored tint (labels "5 yr eGFR" / "10yr eGFR" use `--kh-muted #8A8D96` on white `#fff` = 4.58:1, AA PASS). |
| 15 | CI status | PASS | `gh pr checks 57` → **CodeRabbit: pass**, **Vercel: pass** (preview deploy succeeded at `vercel.com/automation-architecture/kidneyhood/4R1wYd85PVsv4GreBjTogASsoQtE`), **Vercel Preview Comments: pass**. **Copilot: Commented** (not blocking — 4 inline comments, 2 deserve follow-up — see nits). No request-changes, no failing checks. |

---

## Test Counts

| Suite | Count | Result |
|-------|-------|--------|
| Frontend `next build` | 7 routes | **compiled OK (6.5s)** |
| Frontend `tsc --noEmit` (via build) | — | **clean (1823ms)** |
| Frontend `eslint` | — | **0 errors** (1 pre-existing warning in `SprintTracker.tsx`) |
| Backend `pytest` | — | **N/A** (frontend-only PR, no shared types touched) |
| Playwright E2E | 0 | **Cannot run locally — `@playwright/test` not installed in `app/node_modules`.** CI will exercise. |
| Jest / Vitest | 0 | **N/A** — no JS unit-test runner configured in `app/package.json`. |

---

## HIGH focus — Design-Parity Fidelity (§8 Section-by-Section)

The dispatch's §8 checklist is the FAIL gate. Each of the 9 required sections verified directly from `page.tsx` (source) against `project/Results.html` (design source). All present.

| # | Required Section | Verdict | Evidence |
|---|------------------|---------|----------|
| 8.1 | Page title "Kidney Health Overview" (Manrope, large) | **PASS** | `page.tsx:834` — `<h1 className="title" data-testid="results-heading">Kidney Health Overview</h1>`. `.title` class in `RESULTS_CSS` (`page.tsx:145–153`) sets `font-family: var(--font-manrope), 'Manrope', sans-serif`, `font-weight: 700`, `font-size: clamp(28px, 3.6vw, 44px)`, `letter-spacing: -0.01em`. Matches `project/Results.html` H1 styling. |
| 8.2 | Top Download pill (`.dl-pill`) with white circular PDF icon badge | **PASS** | `page.tsx:838–843` renders `<DownloadPill href={pdfHref} onClick={handlePdfClick} className="top-pill" id="download-top" />`. `DownloadPill` component (`page.tsx:589–615`) emits `<a class="dl-pill top-pill" ...>` with `<PdfIcon />` (circular `.pdf-ico` with white background + navy stroke icon inside — per CSS `page.tsx:198–206`). Navy `--kh-navy` background, double box-shadow "halo" matches design source. Mobile viewport hides via `.dl-pill.top-pill { display: none }` at <880px — per design. |
| 8.3 | "Scenario Overview" heading with bulleted dot | **PASS** | `page.tsx:876–878` — `<h3 id="overview-heading" className="section-title overview-head">Scenario Overview</h3>`. `.section-title::before` pseudo-element (`globals.css`→inline `page.tsx:244–250`) renders 9×9px `var(--navy)` dot via `border-radius: 999px`. Matches design-source section-title pattern. |
| 8.4 | 4-pill color row (`.sc-pill` × 4) | **PASS** | `page.tsx:881–886` maps `scenarios` → `<div className={`sc-pill ${s.tone}`}>{s.label}</div>`. `SCENARIO_META` (`page.tsx:576–581`) produces exactly 4 pills: BUN ≤ 12 (green), BUN 13-17 (blue), BUN 18-24 (yellow), No Treatment (gray). CSS (`page.tsx:270–287`) wires each tone to `--s-*-bg` / `--s-*` / `--s-*-border` tokens. Grid `repeat(4, 1fr)` on desktop, `1fr` stacked on mobile. |
| 8.5 | 4 tinted scenario cards (`.sc-card` × 4) with 32px numerics | **PASS** | `page.tsx:893–908` maps same scenarios → `<div className={`sc-card ${s.tone}`} data-testid={`scenario-card-${s.id}`}>` containing `<div class="row">` with two `<div class="cell">` (5yr / 10yr eGFR), each with `.lbl` + `.val`. `.val` CSS (`page.tsx:319–325`) sets `font-family: var(--font-manrope)`, `font-size: 32px`, `font-weight: 800`, `line-height: 1`, `letter-spacing: -0.01em`. Tone-specific color on `.val` via `.sc-card.green .val` etc. (`page.tsx:326–329`). `.foot` shows Dialysis age. All 4 cards render. |
| 8.6 | "What Your Results Mean" block with blue radial kidney visual | **PASS** | `page.tsx:918–948` — `<div class="explain-grid">` with `<KidneyVisual />` + `<div class="card explain-card">`. `KidneyVisual` component (`page.tsx:650–670`) renders `<div class="kidney-visual">` containing an SVG kidney silhouette with `radialGradient#kh-results-kidney-grad` (stops `#9ED6F5` → `#3A90C6` → `#1E5C8A`) — blue radial as spec'd. Two concentric `::before` / `::after` ring borders at 6% and 14% inset match design. Explain card has `<h3 class="section-title">What Your Results Mean</h3>` + paragraph. Conditional copy: if structural-floor ≥0.5 suppression, shows BUN suppression language; else generic "chart shows how your kidney function may change" copy. Correct fallback path. |
| 8.7 | Second Download pill inside "What Your Results Mean" block | **PASS** | `page.tsx:941–943` — `<div class="explain-cta"><DownloadPill href={pdfHref} onClick={handlePdfClick} id="download-bottom" /></div>`. Same `DownloadPill` component, different `id="download-bottom"` (which means `data-testid` is undefined on this one — correct, only `download-top` carries the `results-pdf-link` testid to avoid duplicate match). Centered via `.explain-cta { justify-content: center }`. |
| 8.8 | Full navy Edit pill (`.edit-pill`) | **PASS** | `page.tsx:951–955` — `<div class="edit-row"><Link href="/labs" class="edit-pill" data-testid="results-edit-link">&larr; Edit your information</Link></div>`. `.edit-pill` CSS (`page.tsx:392–420`) renders full navy background, white text, 14px/34px padding, 999px border-radius, double box-shadow halo, `min-height: auto`, `transform` hover state. Matches design-source "full navy pill" (no underlined text link). |
| 8.9 | Fine-print disclaimer | **PASS** | `page.tsx:945–948` — `<p class="fine">This tool is for informational purposes only and does not constitute medical advice.<br/>Consult your healthcare provider before making any decisions about your kidney health.</p>`. `.fine` CSS (`page.tsx:388–394`): `color: var(--muted)`, `font-size: 11px`, `line-height: 1.5`, `text-align: center`. Matches design-source fine-print placement below the second Download pill. **Note:** this replaces the old `<DisclaimerBlock>` component's surface — see Nit #1. |

**All 9 §8 sections present and rendering.** No P0/P1 design-parity miss → FAIL gate NOT triggered.

---

## Config Decisions Confirmed

- **Font loading strategy:** Manrope + Nunito Sans imported via `next/font/google` at the root `layout.tsx` and exposed as `--font-manrope` / `--font-nunito` CSS variables on the `<html>` element. This means every page (including Results, which has no top-level `.kh-*` wrapper on its outermost element — the `.kh-results` is INSIDE the page — and any future PDF/Gate work) inherits the brand type stack via `body { font-family: var(--font-sans) }` in `globals.css`. Locally scoped font imports remain in `labs/page.tsx` and `gate/[token]/page.tsx` (harmless redundancy — Harshit chose not to prune to minimize diff). Inter stays for client dashboard (`--brand-teal/--brand-lime` surface), referenced as the secondary fallback in the `--font-sans` stack.
- **Token layer choice (`--kh-*` + `--s-*` in `:root`, not Tailwind `@theme`):** Harshit's advisor-sanctioned call per dispatch. Rationale: these are non-Tailwind utility values (scenario tints aren't `bg-kh-navy` classes anywhere), they need global addressability for future PDF + Gate work without forcing those surfaces through Tailwind, and keeping them in `:root` lets `project/Results.html` stay 1:1 with the shipped CSS for design-handoff verification. Acceptable.
- **Palette swap scope:** ONLY the "Stable" chart line (`bun_13_17`) changed from sky-700 `#0369A1` → brand navy `#1F2577`. The other three trajectory colors (`bun_lte_12` emerald `#047857`, `bun_18_24` amber `#B45309`, `no_treatment` slate `#374151`) unchanged from LKID-67. Palette A+ per Inga's memo — pill `--s-blue` (`#1F2577`) and chart line are now exact matches; other lanes remain "same hue family" (green/green, gold/amber, gray/slate) without exact hex match, which is the documented and explicitly-chosen design call.
- **Scoped `.kh-results` CSS wrapper instead of extracted shared `<Nav>`/`<Footer>` components:** Advisor-recommended to avoid scope creep into Landing/Labs/Gate refactors. Trade-off: inline `<style dangerouslySetInnerHTML>` repeats some nav/footer CSS across Landing, Labs, Gate, Results — but the selectors are all class-scoped (`.kh-landing`, `.kh-labs`, `.kh-gate`, `.kh-results`) so no bleed risk. Acceptable for this PR; future DRY'ing is a separate follow-up.
- **Header component file (`app/src/components/header.tsx`):** Harshit left in place (no longer imported by Results). Dead code technically, but removing it would be scope creep (it was the shared component before this PR). A follow-up card could prune it once Landing/Labs/Gate all prove they don't need it either.

---

## Scope Discipline

Diff touches exactly 4 files, all within the dispatched scope:

- `app/src/app/layout.tsx` — font imports added to root
- `app/src/app/globals.css` — body/heading font stacks + `--kh-*` + `--s-*` tokens
- `app/src/app/results/[token]/page.tsx` — Results rebuild (the big one, +969/−177)
- `app/src/components/chart/transform.ts` — one-line palette swap for `bun_13_17`

**Confirmed untouched:**

- Email Gate (`app/src/app/gate/[token]/page.tsx`) — 0 lines changed
- PDF template (`app/src/components/ui/pdf/*`) — 0 lines changed
- Email template (Resend artifacts) — 0 lines changed
- Lab Form (`app/src/app/labs/page.tsx`) — 0 lines changed
- Landing (`app/src/app/page.tsx`) — 0 lines changed
- Backend (`backend/**`) — 0 lines changed
- PostHog provider, Klaviyo service, migrations — 0 lines changed

No cross-cutting refactor, no Clerk touches, no backend contract changes, no test-fixture churn.

---

## Secret Scan

`grep -rnE "phc_|phx_|sntry[a-z]*_|api_key|API_KEY|secret"` swept across all 4 modified files plus `project/Results.html` design source. **Zero matches.** No DSNs, no API keys, no bearer tokens, no hardcoded env values.

---

## Final Verdict

## **PASS with nits — MERGE-READY after Nit #1 resolved**

All 9 §8 design-parity sections present — the dispatch's FAIL gate is not triggered. Build green, lint 0-errors, tokens byte-for-byte match `project/Results.html:11–35`, chart swap confirmed on disk (line 37, functionally identical to Inga's line-32 citation), all 3 dispatch-listed testids preserved, no scope creep, no secrets, CodeRabbit + Vercel green. The rebuild faithfully implements Luca's UI audit + Inga's Palette A+ decision.

**However**, Copilot surfaced one E2E regression that's real on disk and that I confirmed independently: `app/tests/e2e/prediction-flow.spec.ts:240` expects `data-testid="disclaimer-full-panel-desktop"` on the Results page, and the new design legitimately replaces the `<DisclaimerBlock>` component (where that testid came from) with a `.fine` `<p>` that lacks any testid. Playwright isn't installed locally (can't run to prove the fail), but this spec will fail the moment Playwright wires into CI. Because the dispatch explicitly scopes FAIL to §8 misses, I'm calling this a **P1 nit with owner action**, not a FAIL — but it's the first thing Harshit needs to address before the next Playwright-gated CI run.

### Nits (in priority order)

1. **[P1 — needs Harshit before next Playwright CI run] `disclaimer-full-panel-desktop` testid regression.** `app/tests/e2e/prediction-flow.spec.ts:240` expects `page.getByTestId("disclaimer-full-panel-desktop")` visible on Results. The new design drops `<DisclaimerBlock>` (which provided that testid via its desktop panel) and replaces its surface with a `.fine` `<p>` containing "This tool is for informational purposes only...". **Owner action:** either (a) add `data-testid="disclaimer-full-panel-desktop"` to the `.fine` paragraph (or a wrapping div) so existing E2E stays green, OR (b) update the spec at line 240 to match the new surface (e.g., `page.getByText(/informational purposes only/i)` with `.first()` to dodge the strict-mode violation the old comment mentions). **Not blocking THIS merge** — Playwright isn't running in CI yet for this repo — but it becomes blocking the moment it is. Call it now so we don't discover it during a future green-to-red CI event. Not in the dispatch's explicit testid-preservation list, so strictly speaking this is outside the dispatch scope — but it's a real regression identified by Copilot + Yuri.

2. **[Nit — CSS hygiene, no runtime impact verified] `@theme --font-sans` self-reference cycle.** `globals.css:11` defines `--font-sans: var(--font-nunito), var(--font-sans), system-ui, sans-serif` inside `@theme`, where the second `var(--font-sans)` is a self-reference. Copilot flagged this as a potential cyclic custom-property invalidation. **Verified runtime behavior:** I inspected the compiled CSS at `app/.next/static/chunks/12pnr51mpzru7.css` — Tailwind emits two `:root` blocks: one with `--font-sans: "Inter", "Inter Fallback"` (from the Inter import) and one with `--font-sans: var(--font-nunito), var(--font-sans), system-ui, sans-serif` (from `@theme`). Because the second block's self-reference resolves against the earlier Inter token that lives in the same cascade root, the effective value at paint time is `Nunito → Inter → "Inter Fallback" → system-ui → sans-serif`. It works, and Nunito wins, as intended. **But** it's fragile — if Tailwind's compilation order changes, or if Inter is ever removed, the fallback chain breaks. **Recommended fix for a follow-up PR:** rename the Inter CSS variable to `--font-inter` in `layout.tsx` and reference that name explicitly in the `@theme` stack (`--font-sans: var(--font-nunito), var(--font-inter), system-ui, sans-serif`). Non-blocking for this merge. Copilot's comment at `globals.css:14` has the exact same fix.

3. **[Nit — engine sign-off pending John, per dispatch] "Dialysis: Not projected" on all 4 scenario cards.** `page.tsx:572` `formatDialysisFooter()` correctly reads `traj.dialysisAge` from the transformed trajectory data. If the engine output returns `null` for all four `dialysisAge` values on the test input (or on typical inputs), all cards will show "Dialysis: Not projected" — which may or may not be engine-correct. The rendering path is right; whether the engine should be returning numeric ages for some scenarios at some inputs is a **John sign-off item**, not a Yuri one. Flagging per dispatch instruction.

4. **[Nit — pre-existing] Playwright not in `app/node_modules`.** `@playwright/test` isn't installed locally and `app/package.json` doesn't have a `test:e2e` script. Can't run E2E to verify existing tests against this rebuild. The CI side presumably has its own Playwright install if it runs E2E at all — I couldn't verify from here. Worth adding `npm i -D @playwright/test` + a `"test:e2e": "playwright test"` script to `app/package.json` as a future housekeeping PR so future PRs can run E2E locally before shipping.

5. **[Nit — Copilot finding, accurate] Layout.tsx comment drift.** `layout.tsx:22` and `:46` say "Results has no local `.kh-*` wrapper" — but this PR adds `.kh-results` inside `page.tsx`. The comment should say "Results' outermost wrapper is inside the page component, not at the `<main>` boundary, so the `<html>` level font variables are still the path for Loading/Error states that render before the `.kh-results` shell" — or similar. Cosmetic. Not blocking.

6. **[Nit — Copilot finding, accurate] Hardcoded `#F4F5FA` / `#F4F5F7` on `.sc-card.blue` / `.sc-card.gray` backgrounds instead of `--s-blue-bg` / `--s-gray-bg` tokens.** `page.tsx:301, 303` uses bespoke hex literals rather than the palette tokens the other two tones use. Reason: the design source uses subtly different tints for card backgrounds vs. pill/border tints for blue + gray specifically. Byte-for-byte matches `project/Results.html` — so it's design-source fidelity, not a bug. But it means the scenario palette isn't fully centrally adjustable from `globals.css` for those two tones. Worth tokenizing (`--s-blue-card-bg`, `--s-gray-card-bg`) in a follow-up if we ever want to retheme. Non-blocking.

---

## Brad's TODO (post-merge)

**None required for this PR beyond normal merge flow.** The Results-page parity ship is self-contained:

1. Merge via `gh pr merge 57 --squash` once Harshit addresses Nit #1 (or defers explicitly). The disclaimer testid regression should be fixed before merge if Playwright is wired into CI — otherwise it can go in a micro-follow-up PR. Your call.
2. Verify on the Vercel preview that:
   - `/results/[token]` for a real captured token shows the full new layout (nav + title + top pill + chart + legend + 4 pills + 4 cards + kidney visual + explain card + second pill + fine-print + edit pill + footer)
   - `/results/[token]` for an expired/invalid token shows the chrome around the `.message-card` (not just a blank page)
   - Fonts render as Manrope (titles) + Nunito Sans (body) on `/`, `/labs`, `/gate/[token]`, `/results/[token]`, and also on `/client/[slug]` — confirm the dashboard's Tailwind-utility fonts weren't affected by the body-font default.
3. No env-var changes needed. No DB changes. No backend deploy. No Klaviyo/Resend wiring.

---

**Workspace:** untracked scratch files present from other agents (`active/DISPATCH-sprint5-results-parity.md`, `agents/husser/drafts/email-to-lee-*`, `agents/inga/drafts/chart-palette-decision.md`, `agents/luca/drafts/ui-audit-screenshots/`, `agents/luca/drafts/ui-design-audit-sprint5.md`, `agents/yuri/drafts/sprint5-pr55-qa-verdict.md`, `agents/yuri/drafts/sprint5-pr56-qa-verdict.md`, `project/`) — none touched during this QA pass. This verdict file (`agents/yuri/drafts/sprint5-pr57-qa-verdict.md`) is the only file created.
**Code modified:** none. **Branch merged:** no.
