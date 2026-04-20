# QA Verdict: PR #35 — LKID-62 Backend tokenized flow

**Reviewer:** Yuri (QA)
**Date:** 2026-04-19
**Branch:** `feat/LKID-62-backend-tokenized-endpoints`
**PR:** https://github.com/Automation-Architecture/LKID/pull/35
**Jira:** https://automationarchitecture.atlassian.net/browse/LKID-62
**Author:** John Donaldson
**LOC:** +1667 / -128 across 7 files (4 commits)

---

## Verdict: **PASS-WITH-CONDITIONS (BLOCK-FOR-FIX)**

One HIGH finding (AC-violating, ~2 line fix) and two MED findings block a clean merge. The rest of the PR is solid: engine untouched, secrets clean, idempotency correct, HIPAA posture on email/name is clean, 17 new integration tests cover the happy paths and key negative paths.

### Summary Table

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Jira AC | 12 | 11 | 1 | 0 |
| Techspec compliance | 6 | 5 | 1 | 0 |
| Focus areas (brief) | 10 | 7 | 2 | 1 |
| Security / secrets | 4 | 4 | 0 | 0 |
| Tests | 4 | 3 | 0 | 1 |
| **Totals** | **36** | **30** | **4** | **2** |

---

## Files Changed

| File | +/- | Role |
|------|-----|------|
| `backend/main.py` | +696/-128 | Rewired `/predict`; added `/results/{token}`, `/leads`, `/reports/{token}/pdf`; fire-and-forget task |
| `backend/services/resend_service.py` | +146/-0 | New — Resend wrapper (`send_report_email`) |
| `backend/services/klaviyo_service.py` | +186/-0 | New — Klaviyo wrapper (`track_prediction_completed`) |
| `backend/services/__init__.py` | +5/-0 | New package init |
| `backend/tests/test_new_flow_endpoints.py` | +748/-0 | New — 17 integration tests (FakeStore pattern) |
| `backend/requirements.txt` | +4/-0 | `resend==2.29.0`, `klaviyo-api==23.0.0`, `pytest-asyncio>=0.24.0`, (ordering) |
| `backend/.env.example` | +10/-0 | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PUBLIC_APP_URL`, `KLAVIYO_PRIVATE_API_KEY` |

Engine (`backend/prediction/engine.py`): **diff = 0 lines**. Confirmed via `git diff origin/main...HEAD -- backend/prediction/engine.py`.

---

## Jira Acceptance Criteria Matrix

| AC | Status | Evidence |
|----|--------|----------|
| All 4 endpoint unit tests pass | PASS | `test_new_flow_endpoints.py`: 17/17 passing (4 classes: Predict, Results, Leads, Pdf) |
| POST /predict no longer accepts/stores name/email | PASS | `main.py:264-305` Pydantic model has no `name`/`email`; test `test_predict_ignores_legacy_name_email_fields` asserts stored `inputs` exclude them |
| POST /predict returns `{report_token, ...full_result}` | PASS | `main.py:498`; test `test_predict_returns_token_and_persists` |
| GET /results/{token} → 404 on unknown | PASS | `main.py:531-532`; test `test_results_invalid_token` |
| GET /results/{token} → 410 on revoked | PASS | `main.py:533-534`; test `test_results_revoked_token` |
| GET /results/{token} includes `captured: bool` | PASS | `main.py:559, 593`; test `test_results_captured_flag_when_linked` |
| POST /leads accepts `{name, email, report_token}`, upserts, links `predictions.lead_id` | PASS | `main.py:644-671` + tests `test_leads_upsert_and_link`, `test_leads_duplicate_email_updates_not_creates` |
| POST /leads fires Klaviyo + Resend fire-and-forget | PASS (with MED-02) | `main.py:868-877`; test `test_leads_fires_email_and_klaviyo` |
| `predictions.email_sent_at` set after Resend succeeds; PDF failure still sets it when email goes out | PASS | `main.py:806-809`; tests `test_leads_pdf_failure_uses_fallback_template` and `test_leads_resend_failure_logged_not_surfaced` |
| GET /reports/{token}/pdf reads from DB, no engine re-run, 30s timeout, **504 on timeout** | **FAIL (HIGH-01)** | `main.py:908-921` — 504 branch is **dead code**: catches `asyncio.TimeoutError`, but Playwright raises `playwright.async_api.TimeoutError` which does NOT inherit from `asyncio.TimeoutError`. Real timeout → 500. No test covers the 504 path. |
| Rate limits: /predict = 10/min/IP, /leads = 5/min/IP | PASS (decorators); NOTE on tests | `main.py:424, 843` decorators present; tests globally disable the limiter via `_disable_rate_limiter` fixture — no direct 429 assertion |
| `RESEND_API_KEY` in `.env.example`; `resend` + `jinja2` in `requirements.txt` | PASS | `.env.example:12`; `requirements.txt:15,17`. `jinja2` already existed (LKID-64) |
| Copilot review required; Yuri review before merge | IN PROGRESS | Copilot: no review posted yet. CodeRabbit: rate-limited ("wait 11 min"). This verdict satisfies the Yuri arm. |

---

## Techspec Compliance Matrix (§5, §7, §8, §4.2)

The techspec file is not in the worktree (`agents/luca/drafts/techspec-new-flow.md` not found; referenced by Jira card and PR body). Compliance called against the Jira AC and PR description, which both quote the techspec sections.

| Section | Check | Status | Evidence |
|---------|-------|--------|----------|
| §5.1 POST /predict | Response shape: `{report_token, egfr_baseline, confidence_tier, trajectories, time_points_months, dial_ages, dialysis_threshold, stat_cards, bun_suppression_estimate, structural_floor}` | PASS | `PredictResponse` at `main.py:346-372` |
| §5.2 GET /results/{token} | Response: `{report_token, captured, created_at, result, lead?}`; 200/404/410 | PASS | `ResultsResponse` at `main.py:375-382`; status codes `main.py:531-534` |
| §5.3 POST /leads | Response superset: `{ok, captured, token}`; 200/404/410 | PASS | `LeadCaptureResponse` at `main.py:385-395`; note PR describes this as a deliberate superset |
| §5.4 GET /reports/{token}/pdf | Streams `application/pdf` with `Content-Disposition`; 30s timeout → 504 | **FAIL** | See HIGH-01. `Content-Disposition: inline` at `main.py:927` (deliberate per docstring; browser-view intent) |
| §7 Token design | `secrets.token_urlsafe(32)`, stored plaintext, no HMAC, URL-safe | PASS | `main.py:463` — `report_token = secrets.token_urlsafe(32)`. DB column `TEXT NOT NULL UNIQUE` (alembic 004). Min-length validator `32` at `main.py:315` is sane floor under 43-char actual |
| §8.4 Resend integration | Subject = "Your Kidney Health Report"; attachment `content_type: application/pdf`; async via `asyncio.to_thread` | PASS | `resend_service.py:36, 77-81, 128` |
| §8.5 Klaviyo integration | Event metric `"Prediction Completed"`; `unique_id=pred_{prediction_id}`; profile upsert via create_event | PASS | `klaviyo_service.py:30, 118`; uses one atomic create_event call |
| §4.2 PDF failure handling | Fallback template; email still sent; `email_sent_at` still set on Resend success | PASS | `main.py:770-777` catches render failure → `pdf_failed=True` → `render_report_email(... pdf_failed=True)` → `send_report_email(pdf_bytes=None)` → `_mark_email_sent` on success. Test `test_leads_pdf_failure_uses_fallback_template` |

---

## Focus Area Findings (Brief §1-10)

| # | Focus | Finding |
|---|-------|---------|
| 1 | HIPAA — no PII in logs | **PASS for email/name** (both service modules log only exception type + prediction_id, never address). **MED-01**: token is logged in full at 6 sites in `main.py`. Token is a bearer credential — leaked token = leaked report access. |
| 2 | Fire-and-forget error handling | Outer `try/except` at `_send_report_email_task` (`main.py:766, 823-829`) catches everything and logs. **MED-02**: on email-template render failure, task `return`s before Klaviyo, contradicting the design comment at line 811 ("independent of Resend outcome"). |
| 3 | Token entropy | PASS. `secrets.token_urlsafe(32)` → 43 chars, URL-safe, no padding. Test `test_predict_returns_token_and_persists` asserts `32 < len(token) <= 64` and `"=" not in token`. DB column is `TEXT` (no length cap). |
| 4 | Idempotency | PASS. `ON CONFLICT (email) DO UPDATE` at `main.py:648-653`, test `test_leads_duplicate_email_updates_not_creates` asserts single row + `updated_at` is set. Klaviyo `unique_id=pred_{prediction_id}` at `klaviyo_service.py:118`. |
| 5 | PDF failure path | PASS. `test_leads_pdf_failure_uses_fallback_template` asserts `pdf_bytes=None`, body contains token, `email_sent_at` set. |
| 6 | Rate limiting | PASS (decorators) / NOTE (tests). `@limiter.limit("10/minute")` at `main.py:424` and `"5/minute"` at `843`. Tests auto-disable via `_disable_rate_limiter` (`test_new_flow_endpoints.py:267-274`) — no 429 assertion. LOW-02. |
| 7 | Backward compatibility | PASS. Pydantic v2 default drops extra fields; `test_predict_ignores_legacy_name_email_fields` confirms `name`/`email` not stored; `test_predict_response_has_no_pii_fields` confirms not echoed. |
| 8 | `min_length=32` on `report_token` | PASS. Actual token is 43 chars; 32 floor rejects obviously-short inputs without over-constraining. |
| 9 | Engine untouched | PASS. `git diff origin/main...HEAD -- backend/prediction/engine.py` → 0 lines. |
| 10 | Env vars — no real keys | PASS. Placeholders only: `re_xxxx`, `pk_xxxx`. Secret scan clean (see Security section). |

---

## Issue List

### HIGH-01 — 504 on Playwright timeout is dead code (AC violation)

- **File/Line:** `backend/main.py:908-915`
- **Severity:** HIGH (Jira AC line: *"30s timeout; returns 504 on timeout"*)

```python
try:
    pdf_bytes = await _render_pdf_for_token(token)
except asyncio.TimeoutError:               # ← never fires for Playwright
    logger.exception("PDF render timed out for token %s", token)
    raise HTTPException(status_code=504, ...)
except Exception:                           # ← actually catches Playwright timeout
    logger.exception("PDF render failed for token %s", token)
    raise HTTPException(status_code=500, ...)
```

`_render_pdf_for_token` uses `page.goto(..., timeout=PDF_RENDER_TIMEOUT_MS)` and `page.wait_for_selector("#pdf-ready", timeout=...)`. Both raise `playwright.async_api.TimeoutError`, which inherits from `Exception` — **not** `asyncio.TimeoutError`. On a real 30s timeout the exception lands in the generic `except Exception:` and the client gets **500**, not the AC-specified 504.

**Fix (John):**
```python
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
# ...
except (asyncio.TimeoutError, PlaywrightTimeoutError):
    ...
    raise HTTPException(status_code=504, ...)
```

Also add a test case under `TestPdfEndpoint` that monkeypatches `_render_pdf_for_token` to raise `PlaywrightTimeoutError` and asserts `r.status_code == 504`. The lack of a 504 test is why the dead-code branch passed review.

### MED-01 — Full `report_token` logged in 6 places (brief-spec violation)

- **Files/Lines:** `backend/main.py:738, 774, 796, 828, 911, 917`
- **Severity:** MED

Brief explicitly requires: *"Exception messages should log prediction UUID or token prefix, not email/name."* Email and name are clean, but the token is logged in full at every error site. A Railway log leak would expose a live bearer credential (`/results/{token}` and `/reports/{token}/pdf` accept anyone holding the token — 256-bit entropy is meaningless if the log system is the attack surface).

**Fix (John):** log a token prefix only (`report_token[:8]`) or the stored UUID (`predictions.id`) instead. Example at line 911:
```python
logger.exception("PDF render timed out for token %s...", token[:8])
```

The Klaviyo service already does the right thing — it logs only `prediction_id` (UUID) and `type(exc).__name__`. The `main.py` logger calls should match that pattern.

### MED-02 — Klaviyo skipped if email template render fails

- **File/Lines:** `backend/main.py:785-798`
- **Severity:** MED

On `render_report_email` exception, the task `return`s at line 798, bypassing the Klaviyo call at line 815. The inline comment at line 811 reads *"Klaviyo event — independent of Resend outcome"*, but template failure (a pre-Resend step) violates that guarantee. The warm-campaign trigger is lost for that lead even though they legitimately submitted their email.

**Fix (John):** set `html_body = None` on template failure and `continue` to Klaviyo (skip Resend but fire Klaviyo), or move the Klaviyo call into a `finally` block. Template render failures are rare but not impossible (the `pdf_failed=True` path has an explicit `ValueError` raise at `email_renderer.py:78-82`).

### LOW-01 — `_fetch_prediction_by_token` called twice per POST /leads

- **File/Lines:** `backend/main.py:854, 863`
- **Severity:** LOW (minor efficiency)

`_upsert_lead_and_link_prediction` already does `SELECT ... FOR UPDATE` on predictions (line 625-637). The `_fetch_prediction_by_token(body.report_token)` at line 863 re-queries the same row. Could be avoided by returning the row from the upsert helper; not a bug, just a round-trip.

### LOW-02 — No 429 integration test

- **File:** `backend/tests/test_new_flow_endpoints.py:267-274`
- **Severity:** LOW

`_disable_rate_limiter` autouse fixture disables the limiter for the entire module. Decorators are present (`10/minute`, `5/minute`) and the AC says "Rate limits: /predict = 10/min/IP, /leads = 5/min/IP" — the decorator presence is verifiable, but runtime behavior is not exercised here. A dedicated test module (not disabling the limiter) could hit `/predict` 11 times and assert the 11th returns 429. Consider a follow-up test card.

### NIT-01 — `Content-Disposition: inline` on `/reports/{token}/pdf` vs `attachment` elsewhere

- **File:** `backend/main.py:928`
- **Severity:** NIT / not a finding

Deliberate per handler docstring ("browser shows it in-tab"); the emailed attachment uses `kidney-health-report.pdf` filename as well. Noted for consistency; not blocking.

---

## Test Results

### Counts (brief-specified files)

```
pytest backend/tests/test_new_flow_endpoints.py \
       backend/tests/test_prediction_engine.py \
       backend/tests/test_email_renderer.py -v
```
- `test_new_flow_endpoints.py` — **17 passed**
- `test_prediction_engine.py` — **124 passed**
- `test_email_renderer.py` — **10 passed**
- **Total: 151 passed, 0 failed** (on files that ran)

### test_predictions_table.py — pre-existing environment issue, NOT a PR #35 regression

```
30 errors (all "FileNotFoundError: [Errno 2] No such file or directory: 'python'")
```

This test shells out to bare `python -m alembic` (`tests/test_predictions_table.py:58`). The local box has `python3` only; no `python` alias. This test file was introduced by **PR #33 (LKID-61)** per `git log --oneline -- backend/tests/test_predictions_table.py`, and its diff in PR #35 is 0. Not a PR #35 blocker, but worth filing a separate infra card ("replace `python` with `sys.executable` in alembic subprocess call") so the migration test runs on all devs' machines.

### Reconciling with John's "197/197 passing"

John's report counts `test_predictions_table.py` as 30 passing, which it does when the shell has a `python` binary on PATH. On my machine (and GitHub Actions ubuntu-22.04 without a `python` symlink, potentially) those 30 error out. Actual pass count here is **167 passed + 30 errors (env-only, pre-existing)**. PR #35 does NOT introduce the env fragility; mentioned for accuracy.

### Test quality

- FakeStore pattern (`test_new_flow_endpoints.py:108-221`) is a reasonable mid-grade mock: it mutates state in-memory so idempotency tests exercise real UPSERT semantics (duplicate email → same row, updated_at populated). It does NOT enforce SQL correctness — that's covered by `test_predictions_table.py` at the migration layer. Acceptable.
- Negative paths (`test_results_invalid_token`, `test_results_revoked_token`, `test_leads_invalid_token`, `test_leads_revoked_token_returns_410`, `test_pdf_endpoint_unknown_token`, `test_pdf_endpoint_revoked_token`) all assert the correct status code and the error envelope shape.
- Fire-and-forget draining via 5x `await asyncio.sleep(0)` (`_drain_background_tasks`) is pragmatic; a `wait_for` on a real task handle would be stricter but this is good enough for the mock pattern.
- **Missing coverage:** no test for the 504 timeout path (see HIGH-01), no test for the 429 rate-limit path (LOW-02).

---

## Security / Secret Scan

Command:
```bash
git diff origin/main...HEAD > /tmp/pr35.diff
grep -cE "(re_[A-Za-z0-9]{15,}|pk_live_|sk_live_)" /tmp/pr35.diff
# Output: 0
```

- No Resend key matching `re_[A-Za-z0-9]{15,}` committed.
- No Klaviyo `pk_live_` / `sk_live_` style keys.
- `.env.example` uses `re_xxxx`, `pk_xxxx`, `whsec_xxxx`, `sk_test_xxxx` — all placeholders.
- `PDF_SECRET` default of `"dev-pdf-secret"` is dev-safe; production override on Railway is already documented.

**Result: clean.**

---

## Copilot / CodeRabbit Status

- **Copilot:** Review posted during my QA pass (review id `4136779336`, 7 inline comments). **Copilot independently confirmed HIGH-01** (Playwright TimeoutError not being a subclass of `asyncio.TimeoutError`). Other Copilot findings, triaged:
  - [MED, should fix] `resend_service.py:82` — `list(pdf_bytes)` inflates every byte to a Python int, massive memory/payload overhead. Base64-encode instead. Call this **MED-03**.
  - [LOW] `main.py:569` — `SELECT name, email, created_at, updated_at FROM leads` fetches `email` but never returns it; trim the SELECT to reduce PII handling surface. Call this **LOW-03**.
  - [LOW] `main.py:496` — dev-mode (`DATABASE_URL` unset) returns 200 + token that can never resolve; comment says `/results` will 404 but actual behavior is 503. Cosmetic but worth tidying. Call this **LOW-04**.
  - [LOW / docs mismatch] `resend_service.py:144` — comment mentions logging `repr(exc)` but code logs only `type(exc).__name__`. The code behavior is correct (PII-safe); the comment should be corrected.
  - [NIT] `test_new_flow_endpoints.py:37` — unused `patch` import.
  - [NIT] `requirements.txt:10` — `pytest-asyncio` may be unneeded since tests use `@pytest.mark.anyio`. Verify before dropping.
- **CodeRabbit:** Rate-limited ("wait 11 min 2 sec"). One auto-generated warning comment; no substantive findings posted yet. Re-poll before merge.

### Updated blocker list after Copilot review

- HIGH-01 (Playwright timeout → 504 dead code) — confirmed by Copilot independently
- MED-01 (token logging)
- MED-02 (Klaviyo skipped on template failure)
- **MED-03 (new) — `list(pdf_bytes)` in `resend_service.py:82` bloats attachment payload; switch to base64**

MED-03 is an efficiency/reliability concern rather than a correctness bug, but for production sends of real PDF attachments (tens of KB each) the serialized JSON payload to Resend balloons roughly 4-5x. Recommend fixing in the same commit as HIGH-01/MED-01/MED-02.

---

## Additional Notes (not findings)

- **Workspace discipline:** `git status` clean throughout (only pre-existing untracked `.vercel/` and `app/.clerk/` outside PR scope). No stash, no cross-branch contamination.
- **Legacy `/predict/pdf` preserved** (`main.py:939-1005`) — intentional per PR description for the current old `/predict` page; LKID-66 will remove.
- **Pydantic v2 extras handling:** by default Pydantic v2 drops unknown fields silently, so `{name, email}` from the legacy page are dropped before the engine. Tests `test_predict_ignores_legacy_name_email_fields` and `test_predict_response_has_no_pii_fields` verify this.
- **HIPAA posture on service modules is exemplary:** `resend_service.py:137, 145` and `klaviyo_service.py:174-185` log only boolean outcomes, exception type, and `prediction_id`. This is the pattern `main.py` should copy (see MED-01).

---

## Failure Summary

### HIGH Severity (1)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| HIGH-01 | `backend/main.py:908-915` | `except asyncio.TimeoutError` is dead code — Playwright raises its own `TimeoutError` which isn't a subclass. 504 branch never fires; client gets 500 on a real 30s timeout. AC violation. | Import `playwright.async_api.TimeoutError as PlaywrightTimeoutError` and catch both. Add a pytest that monkeypatches the render to raise `PlaywrightTimeoutError` and asserts 504. |

### MEDIUM Severity (2)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| MED-01 | `backend/main.py:738,774,796,828,911,917` | Full `report_token` (live bearer credential) logged at 6 error sites. Brief requires: log prediction UUID or token *prefix* only. | Log `token[:8]` or the `predictions.id` UUID instead. |
| MED-02 | `backend/main.py:785-798` | If `render_report_email` raises, task `return`s before Klaviyo call at line 815. Comment on 811 promises "independent of Resend outcome" — violated. | Fire Klaviyo regardless of template failure. Either set `html_body=None` and continue, or wrap Resend+mark_sent in a separate try block and keep the Klaviyo call unconditional. |

### LOW Severity / Notes (2)

| ID | Component | Issue |
|----|-----------|-------|
| LOW-01 | `backend/main.py:854,863` | `_fetch_prediction_by_token` called twice per POST /leads — once inside upsert helper (SELECT FOR UPDATE), once after. Minor round-trip; no correctness issue. |
| LOW-02 | `backend/tests/test_new_flow_endpoints.py:267-274` | `_disable_rate_limiter` fixture disables limiter globally; no 429 assertion test. AC is met by decorator presence. File a follow-up test card. |

### Pre-existing / Out of Scope

- `test_predictions_table.py` errors 30x with `FileNotFoundError: 'python'` — introduced by PR #33, not PR #35. File a separate infra fix card (use `sys.executable`).

---

## Overall Readiness Assessment

**PR #35: NOT READY — BLOCK FOR FIX.**

Conditions for PASS:
1. Fix HIGH-01 (Playwright TimeoutError catch) + add a 504 regression test.
2. Fix MED-01 (token logging — prefix or UUID only) across all 6 sites in `main.py`.
3. Address MED-02 (Klaviyo fire-regardless of template failure).
4. Copilot review completes and is clean (or its findings are addressed).
5. CodeRabbit rate limit clears and review is clean (or its findings are addressed).

LOW-01/LOW-02 and the `test_predictions_table.py` env issue are **not merge blockers** — file as follow-up cards.

Everything else is strong: engine frozen (diff=0), secrets clean, HIPAA on user PII clean, idempotency correct, backward-compat preserved and tested, 17 solid integration tests covering happy and key negative paths. Once the three blockers are resolved this is a merge.

---

## Recommendation

**Verdict:** PASS-WITH-CONDITIONS
**Action:** Block-for-fix. Return to John Donaldson with the three items above. Re-review after the fix commit lands.

---

# Re-verification 2026-04-20

**Fix commit verified:** `c6ecef6` — "fix(backend): address PR #35 QA findings — HIGH-01 / MED-01 / MED-02 / MED-03" (single commit on top of `24dace7`). HEAD confirmed via `git rev-parse HEAD` = `c6ecef6c3d66b11e18dca23ec595cb4f52606861`.

## Per-finding verdict

### HIGH-01 — Playwright timeout catch: PASS

Evidence:
- `backend/main.py:54` imports `from playwright.async_api import TimeoutError as PlaywrightTimeoutError` with a `class PlaywrightTimeoutError(Exception)` fallback at line 56 for envs without playwright.
- `backend/main.py:930` catches `(asyncio.TimeoutError, PlaywrightTimeoutError)` as a tuple — both classes mapped to 504 with a multi-line comment explicitly documenting that Playwright's TimeoutError is not a subclass of asyncio.TimeoutError.
- Generic `except Exception` at line 942 still returns 500 for non-timeout render failures (e.g., chromium crash).
- Residual `except.*asyncio\.TimeoutError` matches in `backend/main.py`: exactly 1, and it's the justified tuple catch. No unguarded/misbehaving asyncio.TimeoutError handlers remain.
- New test `TestPdfEndpoint::test_pdf_endpoint_timeout_returns_504` PASSED — asserts status code 504 + detail text contains "timed out"/"timeout".
- New test `TestPdfEndpoint::test_pdf_endpoint_generic_failure_returns_500` PASSED — guards against over-broad timeout catching (RuntimeError still maps to 500, not 504).

### MED-01 — Full `report_token` logging: PASS

Evidence:
- Broad grep sweep `grep -nE "logger\.\w+\(" backend/main.py backend/services/*.py -A3 | grep -E "\btoken\b"` returned **3 residual matches** — all justified:
  - `main.py:506` — `"POST /predict returning token without DB insert (DATABASE_URL unset; dev mode only)"` — dev-mode literal, no token value interpolated.
  - `main.py:936` — `"PDF render timed out for token_prefix=%s", token[:8]` — 8-char prefix only.
  - `main.py:944` — `"PDF render failed for token_prefix=%s", token[:8]` — 8-char prefix only.
- All 6 original line numbers (738, 774, 796, 828, 911, 917) now use either `prediction_id` (UUID, token-free) or `token_prefix=token[:8]`. Cross-ref with John's PR comment confirms replacement map.
- **Zero full-token logs remain.** MED-01 fully remediated.

### MED-02 — Resend failure no longer short-circuits Klaviyo: PASS

Evidence:
- Structural inspection of `_send_report_email_task` (main.py:755-849): Resend pipeline (PDF render + template render + send + mark_email_sent) is wrapped in one try/except at lines 786-830. The Klaviyo `track_prediction_completed` call is in a separate, structurally independent try/except at lines 836-849. Klaviyo fires regardless of Resend outcome.
- `email_sent_at` invariant preserved: `_mark_email_sent(report_token)` is called at line 824 **only** when `sent_ok` is True (Resend succeeded). Template render failure raises into the outer except at 825, skipping the mark. Resend failure (`send_report_email` returns False or raises) likewise skips the mark. Correct.
- New test `TestKlaviyoIndependentOfResend::test_klaviyo_fires_even_when_resend_fails` PASSED — Resend raises RuntimeError, Klaviyo.await_count == 1.
- New test `TestKlaviyoIndependentOfResend::test_klaviyo_fires_even_when_template_render_fails` PASSED — `render_report_email` raises, Klaviyo still fires. This is the original MED-02 trigger scenario.

### MED-03 — `list(pdf_bytes)` attachment bloat: PASS

Evidence:
- `grep -n "list(pdf_bytes" backend/services/resend_service.py`: **zero matches**. Only a comment at line 77 referencing the former code is present for history.
- `grep -nE "b64encode|base64" backend/services/resend_service.py`: `import base64` at line 27; `base64.b64encode(pdf_bytes).decode("ascii")` at line 84.
- New test `TestResendAttachmentEncoding::test_resend_attachment_is_base64` PASSED — asserts the captured attachment's `content` is a `str`, base64-decodes back to the original bytes (round-trip).
- New test `TestResendAttachmentEncoding::test_resend_no_attachment_when_pdf_bytes_none` PASSED — fallback path (no PDF) emits no `attachments` key in params.

## Test quality spot-check

Each of the 6 new tests read for rigor:
- **504 test**: uses `main.PlaywrightTimeoutError` (the same class main catches — respects the fallback-stub path when playwright isn't installed), seeds a prediction, monkeypatches `_render_pdf_for_token`, asserts `r.status_code == 504` AND detail text. Correct target.
- **500 test**: pairs with the 504 test, explicitly guards against over-broad tuple catches.
- **Klaviyo-indep (Resend fails)**: mocks `send_report_email`, `track_prediction_completed`, and the PDF renderer independently; asserts `send_mock.await_count == 1` AND `klav_mock.await_count == 1`.
- **Klaviyo-indep (template fails)**: uses a `lambda` that raises via generator-expression throw trick to inject a synchronous template error — matches the original MED-02 scenario.
- **Base64 test**: calls the sync `_send_sync` helper directly, stubs the Resend SDK at `_resend_sdk.Emails.send`, captures params, asserts `content` is str AND `base64.b64decode(content) == pdf` (real round-trip, not just type check).
- **No-attachment test**: asserts `"attachments" not in captured["params"]` — exact absence check, not just len-zero.

All mocks are realistic; all assertions target the right behavior. No test-quality concerns.

## Regression

- `pytest backend/tests/test_new_flow_endpoints.py backend/tests/test_email_renderer.py -v`: **33 passed** (23 endpoint + 10 email). Matches expected count.
- `pytest backend/tests/test_prediction_engine.py -v`: **124 passed**, unchanged. Engine untouched by fix commit.
- No new failures. No flaky tests observed.

## Secret scan

`git diff 587225a..HEAD -- backend/ | grep -E "(re_[A-Za-z0-9]{15,}|pk_live_|sk_live_|KLAVIYO_.*=.{15,})"`: **zero matches**. Clean.

## Copilot / CodeRabbit status

- Copilot posted its review at `2026-04-20T00:28Z` (before my original verdict at `00:34Z`). Its findings were already incorporated into this verdict (HIGH-01 cross-confirmed, MED-03 new-from-Copilot, plus LOW/NIT follow-ups).
- **No new Copilot review** has been posted since the `c6ecef6` fix commit. The existing Copilot findings on merge-blockers are resolved; LOW/NIT items (LOW-03/04 + two NITs) remain as follow-up cards per John's PR comment.
- **CodeRabbit still absent** — no review comments on the PR. Rate-limited at original review time; still not caught up. Not a merge blocker given Copilot + QA both reviewed.

## New issues introduced by fix

**None.** All fix changes are surgical:
- HIGH-01 fix: added import + fallback class + tuple catch. No behavioral change for success path.
- MED-01 fix: logger message string changes only. No control flow change.
- MED-02 fix: structural try/except restructure. Behavior preserved on happy path (verified by `test_leads_fires_email_and_klaviyo` still passing).
- MED-03 fix: encoding swap. `test_leads_fires_email_and_klaviyo` still passes, confirming end-to-end Resend dispatch unbroken.

No scope creep, no drive-by refactors, no ancillary file touches outside `backend/main.py`, `backend/services/resend_service.py`, and `backend/tests/test_new_flow_endpoints.py`.

## Final verdict

**PASS — MERGE-READY.**

All four blockers (HIGH-01, MED-01, MED-02, MED-03) fully remediated with appropriate regression tests. 33/33 endpoint + email tests pass. 124/124 engine tests unchanged. Secret scan clean. No new issues. Copilot's merge-blocker findings cross-resolved; LOW/NIT items tracked as follow-ups.

Ready for `gh pr merge 35 --squash`.
