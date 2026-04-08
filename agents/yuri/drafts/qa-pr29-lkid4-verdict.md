# QA Verdict -- PR #29 `feat/LKID-4-pdf-export`

**Date:** 2026-04-07
**Reviewer:** Yuri (QA/Test Writer)
**Card:** LKID-4 (PDF export -- Playwright rendering)
**Files changed:** `app/src/app/internal/chart/page.tsx` (new), `app/src/app/internal/layout.tsx` (new), `app/src/app/results/page.tsx` (modified), `backend/main.py` (modified), `backend/requirements.txt` (modified), `backend/.env.example` (modified)

---

## Verdict: FAIL -- 2 Blocking Issues

---

## Test Run

### Backend prediction engine tests

```
cd backend && venv/bin/python -m pytest tests/test_prediction_engine.py -v --tb=short
```

Result: **124 passed, 0 failed** in 0.05s. Engine tests unaffected by this PR.

### Next.js build

```
cd app && npx next build
```

Result: **Compiled successfully.** Route `/internal/chart` appears as static route in output. No TypeScript errors.

---

## Blocking Issues

### B-1: `prediction_inputs` sessionStorage mismatch -- PDF endpoint will always 422

**Location:** `app/src/app/results/page.tsx:92-96` (consumer) vs `app/src/app/predict/page.tsx:308-310` (producer)

The predict form stores only `{ bun: Number(values.bun) }` in `sessionStorage("prediction_inputs")`:

```typescript
// predict/page.tsx line 308-310
sessionStorage.setItem(
  "prediction_inputs",
  JSON.stringify({ bun: Number(values.bun) })
);
```

The PDF download handler reads this and POSTs it directly to `/predict/pdf`:

```typescript
// results/page.tsx line 92-96
const inputsRaw = sessionStorage.getItem("prediction_inputs");
const inputs = JSON.parse(inputsRaw);
const res = await fetch(`${API_URL}/predict/pdf`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(inputs),
});
```

The `/predict/pdf` endpoint validates against `PredictRequest`, which requires `bun`, `creatinine`, `potassium`, `age`, and `sex`. Sending only `{ bun }` will produce a 422 validation error. **Every PDF download attempt will fail.**

**Fix:** The predict form must store the full `PredictRequest` payload in `prediction_inputs` (the same `payload` object already built at predict/page.tsx lines 244-251), not just the BUN value. The existing BUN-only storage was designed for the structural floor callout, not for re-submitting to the API. Either:
- Store the full payload as `prediction_inputs` and extract `.bun` where needed for the callout, or
- Store both keys: `prediction_inputs` (full payload) and `prediction_bun` (BUN-only for the callout).

### B-2: Playwright page leak on rendering failure

**Location:** `backend/main.py:534-551`

If `page.goto()`, `page.wait_for_selector()`, or `page.pdf()` throws an exception, the `page.close()` call on line 545 is skipped because the try block exits into the except handler. Each failed PDF request leaks an open Chromium page in the persistent browser instance. Under sustained errors, this accumulates open pages until memory is exhausted.

**Fix:** Move `page.close()` into a `finally` block:

```python
page = await browser.new_page(viewport={"width": 1060, "height": 800})
try:
    await page.goto(chart_url, wait_until="networkidle")
    await page.wait_for_selector("#pdf-ready", timeout=10000)
    pdf_bytes = await page.pdf(...)
finally:
    await page.close()
```

---

## Non-Blocking Issues

### N-1: Base64 encoding mismatch -- `urlsafe_b64encode` vs `atob()`

**Location:** `backend/main.py:525` (encoder) vs `app/src/app/internal/chart/page.tsx:71` (decoder)

The backend uses `base64.urlsafe_b64encode()` which produces `-` and `_` characters instead of `+` and `/`. The frontend uses `atob()` which expects standard base64. For JSON payloads, these characters rarely appear (JSON is ASCII text that mostly encodes to the safe overlap), but this is a latent correctness bug. A payload containing certain byte sequences (e.g., float values that produce specific base64 segments) could fail silently.

**Recommended fix:** Either switch backend to `base64.b64encode()` (standard base64, matching `atob()`), or add a client-side decode that handles both alphabets:

```typescript
// Replace atob(dataParam) with:
const json = atob(dataParam.replace(/-/g, '+').replace(/_/g, '/'));
```

The standard `b64encode` approach is simpler and eliminates the mismatch entirely.

Also noted by Copilot (comment #1).

### N-2: Error detail leak in PDF endpoint -- exception message exposed to client

**Location:** `backend/main.py:548-551`

```python
raise HTTPException(
    status_code=502,
    detail=f"PDF rendering failed: {exc}",
)
```

This exposes internal Playwright exception messages to the API consumer (e.g., browser crash details, timeout specifics, internal URL). This violates the approved error envelope (Decision #9) and could leak the `FRONTEND_INTERNAL_URL` and `PDF_SECRET` (embedded in the chart URL that appears in Playwright errors).

**Recommended fix:** Return a generic message in the response and keep the full exception in server logs only:

```python
return JSONResponse(
    status_code=502,
    content={
        "error": {
            "code": "PDF_RENDER_ERROR",
            "message": "PDF generation failed. Please try again.",
            "details": [],
        }
    },
)
```

Also noted by Copilot (comment #9).

### N-3: Race condition in `_get_browser()` -- no lock on lazy init

**Location:** `backend/main.py:183-193`

Under concurrent requests, multiple coroutines can see `_browser is None` simultaneously, each launching Playwright and a Chromium instance. The last one wins and previous instances are leaked (the global references get overwritten without closing the old ones).

**Recommended fix:** Guard with `asyncio.Lock()`:

```python
_browser_lock = asyncio.Lock()

async def _get_browser():
    global _playwright, _browser
    if _browser is not None:
        return _browser
    async with _browser_lock:
        if _browser is not None:  # double-check after acquiring lock
            return _browser
        from playwright.async_api import async_playwright
        _playwright = await async_playwright().start()
        _browser = await _playwright.chromium.launch(headless=True)
        logger.info("Playwright browser launched")
    return _browser
```

Also noted by Copilot (comment #7).

### N-4: `NEXT_PUBLIC_PDF_SECRET` is client-bundle-exposed -- not a real secret

**Location:** `app/src/app/internal/chart/page.tsx:18`

The `NEXT_PUBLIC_` prefix means this value is embedded in the client-side JavaScript bundle. Anyone can inspect the bundle and extract the secret. The secret check on line 61 is purely cosmetic -- it prevents casual direct navigation but not determined access.

This is acceptable for a marketing/lead-gen app where the internal page just renders the same chart data that's already visible on the results page. The secret prevents accidental crawling and casual misuse. However, the docstring on line 8 ("This page is NOT publicly accessible") overstates the protection. Should be softened to "This page is intended for backend-driven Playwright rendering" (as Copilot also noted).

For MVP this is fine. If protection matters post-launch, switch to server-side secret validation or short-lived signed tokens.

### N-5: `PDF_SECRET` defaults to `"dev-pdf-secret"` in production

**Location:** `backend/main.py:56`

If `PDF_SECRET` env var is unset on Railway, the fallback `"dev-pdf-secret"` is used. This is guessable and makes the internal chart page accessible to anyone who knows the convention.

**Recommended fix:** Log a warning on startup if `PDF_SECRET` is the default value, or fail fast in non-dev environments.

### N-6: Internal layout renders `<html>` and `<body>` tags

**Location:** `app/src/app/internal/layout.tsx:10-15`

The internal layout renders its own `<html>` and `<body>` tags. In Next.js App Router, a nested segment layout that includes these tags can conflict with the root layout. The Next.js build currently compiles without error because `/internal` appears to be treated as a separate route group. However, this is fragile -- future Next.js versions may enforce single-root-layout more strictly.

For Playwright PDF rendering, this actually works well because the internal page gets a clean document without the app's global styles/header/footer. Functionally correct for the use case, but architecturally fragile.

**Recommended fix (low priority):** Use a route group `(internal)` with its own root layout file, per Next.js conventions, rather than relying on the current behavior.

### N-7: No rate limit response model on `/predict/pdf`

**Location:** `backend/main.py:497-499`

The `/predict/pdf` endpoint has `@limiter.limit("5/minute")` but does not declare `responses=` with 429/502 models in the route decorator (unlike `/predict` which declares 422/429/500). This means the OpenAPI spec omits these error shapes for the PDF endpoint.

---

## Security Review

| Check | Status | Notes |
|-------|--------|-------|
| XSS via query params | OK | Data is base64-decoded and JSON-parsed, then passed to React components via props. No `dangerouslySetInnerHTML`. React escapes all rendered values. |
| Secret leak via error messages | ISSUE (N-2) | Playwright exception message in 502 response could contain the internal chart URL with the secret. Fix: generic error message. |
| Secret exposure in client bundle | ISSUE (N-4) | `NEXT_PUBLIC_` prefix bundles secret into JS. Acceptable for MVP. |
| CORS on /predict/pdf | OK | Same CORS config as /predict. Origin check via middleware. |
| Rate limiting on /predict/pdf | OK | 5/minute limit applied. Stricter than /predict (10/minute), appropriate for heavier endpoint. |
| Playwright sandbox | OK | Chromium launched with default headless sandbox. No `--no-sandbox` flag. |
| Internal page indexing | LOW RISK | No robots.txt Disallow for `/internal/`. Search engines could index it. Low risk since the page shows "Unauthorized" without the correct secret. |

---

## Architecture Review

The overall architecture is sound: stateless PDF generation via backend Playwright rendering, re-running the engine for each request (no stale cache). The internal chart page renders the same EgfrChart component used on the results page, ensuring visual parity.

Key observations:

1. **Stateless by design** -- The backend re-runs the prediction engine from the raw form inputs rather than accepting pre-computed results. This is correct: it prevents tampering with trajectory data and ensures the PDF always reflects current engine behavior.

2. **Browser lifecycle** -- Persistent browser instance across requests (created on first use, closed on app shutdown) is the right approach for Railway. Cold-starting Chromium per request would add 2-5s latency.

3. **`id="pdf-ready"` sentinel** -- The internal page sets this ID when the chart has rendered, and Playwright waits for it. This ensures the SVG is fully in the DOM before `page.pdf()`. The 10-second timeout is reasonable.

4. **Structural floor callout in PDF** -- Correctly duplicated from the results page with inline styles (since Tailwind classes won't be available in the minimal internal layout). The suppression threshold check (`>= 0.5`) matches the results page.

5. **PDF dimensions** -- Letter format, 960px container width, 1060px viewport. These are reasonable for US Letter (8.5" x 11") with margins.

---

## What Was Verified

1. Internal chart page correctly parses base64 data and renders chart via `transformPredictResponse()` -- same transform used on the results page. Type casting to `PredictResponse` matches the backend response shape.

2. Secret protection: client-side check on line 61 shows "Unauthorized" if secret mismatch. Not real security (N-4) but sufficient for MVP.

3. Backend endpoint: runs engine with full PredictRequest fields, encodes as JSON+base64, navigates Playwright to internal chart page, waits for `#pdf-ready`, calls `page.pdf()`, returns StreamingResponse. Flow is correct but has page leak (B-2) and race condition (N-3).

4. Error handling: PDF button has idle/loading/done/error states with auto-reset timeouts. Backend has try/except but leaks details (N-2) and pages (B-2).

5. PDF button: reads from sessionStorage -- but reads wrong key shape (B-1). The fetch/blob/download pattern is correct once the input data is fixed.

6. Existing tests: 124/124 pass. Next.js build compiles.

7. Copilot review: 9 comments reviewed. All substantive findings are incorporated into this verdict (B-2, N-1, N-2, N-3, N-4, N-5, N-6).

---

## Summary

Two blocking issues prevent merge:

1. **B-1:** The PDF download will always 422 because the predict form only stores `{ bun }` in sessionStorage, not the full PredictRequest payload. Every user click on "Download Your Results (PDF)" will fail with "PDF failed -- try again."

2. **B-2:** Playwright pages leak on rendering failures because `page.close()` is not in a `finally` block. Under error conditions, this will exhaust Railway container memory.

Six non-blocking issues identified (N-1 through N-7), including a latent base64 encoding mismatch, error detail leaks, a race condition in browser initialization, and client-exposed secrets. None are launch-blockers but should be addressed before production traffic.

The architecture is sound and the approach is correct. Once B-1 and B-2 are fixed, the PDF pipeline will work end-to-end.

*Yuri -- 2026-04-07 -- Sprint 3*
