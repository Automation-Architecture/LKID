# Lean Launch Profile -- API Review

**Author:** John Donaldson (API Designer)
**Date:** 2026-03-25
**Status:** Decision rendered

---

## Decision: PDF Generation Approach

**Verdict: Server-side with Playwright.**

Rationale:

1. The chart is a React/Visx SVG rendered in the browser. `html2canvas` rasterizes DOM elements via Canvas2D -- it handles SVG inconsistently across browsers, mangles dash patterns, and produces blurry output at non-1x DPI. The 4 trajectory lines with distinct dash patterns are a fidelity risk.

2. `weasyprint` and `reportlab` cannot render React components or SVG interactivity at all. They would require rebuilding the chart layout in a completely separate template. Two sources of truth for the same visual -- unacceptable maintenance burden for a 2-sprint project.

3. **Playwright** (headless Chromium) renders the exact same React/Visx component the user sees. The flow:
   - `POST /predict/pdf` receives the same lab values as `POST /predict`
   - Server runs the prediction engine, injects results into a lightweight Next.js page (or standalone HTML template with the chart component)
   - Playwright opens the page, waits for SVG render, calls `page.pdf()`
   - Returns the PDF as `application/pdf`

4. Playwright is already in the ecosystem (test tooling). Single dependency. SVG fidelity is pixel-perfect because it uses the same rendering engine. File size is reasonable (~100-200KB for a single-page PDF with vector SVG).

5. Cold start concern on serverless is real but manageable. Playwright can run on Railway/Render where the backend lives. If CTO picks Vercel serverless for the backend, we need a sidecar service or use `@playwright/browser` with a pre-warmed instance. Flag this for Luca.

**Rejected alternatives:**
- `html2canvas + jsPDF` -- SVG dash pattern fidelity risk, client-side means no PDF without JS, harder to test
- `weasyprint` -- cannot render React/Visx, separate template required
- `reportlab` -- Python-native but manual layout, no SVG support

---

## Endpoint Review (12 to 5)

The reduced surface is correct. Mapping from my original contract:

| Lean Endpoint | Original Endpoint(s) Replaced | Status |
|---|---|---|
| `POST /auth/request-link` | Same | OK |
| `POST /auth/verify` | Same, minus JWT rotation/refresh | OK -- managed provider handles tokens |
| `POST /predict` | Same, guest-only mode | OK |
| `POST /predict/pdf` | Was deferred to Phase 2b, now promoted | OK -- required by client |
| `GET /health` | Same | OK |

**Dropped endpoints (correct to drop):**
- `POST /auth/refresh`, `POST /auth/logout` -- managed provider handles session lifecycle
- `GET /me`, `DELETE /me` -- no user accounts
- `POST /lab-entries`, `GET /lab-entries`, `GET /lab-entries/{id}`, `DELETE /lab-entries/{id}` -- no stored entries

No missing endpoints. The 5-endpoint surface covers the entire user flow.

---

## Concerns and Flags

1. **`POST /predict` request shape changes.** Original contract had two modes (authenticated with `lab_entry_ids` vs guest with inline `lab_entries`). Lean launch is guest-only. Simplify to a flat request body: `{ name, email, bun, creatinine, potassium, age }`. No arrays, no UUIDs, no `oneOf`. I will update the contract.

2. **Lead capture in `/predict`.** The `leads` table insert should happen inside the `/predict` handler, not as a separate endpoint. Name + email + lab values + timestamp in one row. Confirm with Gay Mark.

3. **`/predict/pdf` should accept prediction results, not re-run the engine.** Two options:
   - (A) Client calls `/predict`, gets results, then calls `/predict/pdf` with the results payload -- avoids double computation
   - (B) `/predict/pdf` re-runs the engine from lab values -- simpler API, no state passing
   - **I recommend (B).** The prediction is fast (pure math), and passing the full results payload back is fragile. Keep it stateless.

4. **CORS simplification is correct.** Drop `staging.kidneyhood.org` and `www.kidneyhood.org` from allowed origins. Lean launch: `localhost:3000` + one production domain.

5. **No `session_token` cookie needed.** Original contract used httpOnly cookies for guest session persistence. Lean launch has no persistence -- remove the `GuestSession` security scheme entirely.

6. **Rate limiting: provider-level only.** Drop custom `X-RateLimit-Remaining` headers. Revisit in Phase 2.

---

## Updated Contract TODO

I will produce a `lean-api-contract.json` (OpenAPI 3.1) with just the 5 endpoints and the simplified request/response shapes. Targeting end of day.
