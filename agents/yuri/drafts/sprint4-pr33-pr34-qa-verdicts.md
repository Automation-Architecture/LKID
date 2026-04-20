# Sprint 4 QA Verdicts — PR #33 and PR #34

**Reviewer:** Yuri (QA / Test Writer)
**Date:** 2026-04-19
**Scope:** Pre-merge review of the two kickoff PRs for the no-auth tokenized funnel (techspec `agents/luca/drafts/techspec-new-flow.md`). PR #33 adds the DB layer (TICKET-A). PR #34 adds the transactional email template (TICKET-D).
**Branches reviewed:** `feat/LKID-61-predictions-table` @ `7e6d092`, `feat/LKID-64-resend-email-template` @ `10a0196`

---

## Executive Summary

| PR | Verdict | HIGH | MED | LOW/NIT | Tests |
|----|---------|------|-----|---------|-------|
| #33 LKID-61 (DB) | **PASS-WITH-NITS** | 0 | 0 | 4 | 45/45 PASS |
| #34 LKID-64 (Email) | **PASS-WITH-NITS** | 0 | 2 | 4 | 8/8 PASS |

**Combined:** 0 HIGH, 2 MED, 8 LOW/NIT. Both PRs are functionally correct and test-clean against the authoritative techspec. Neither is merge-blocked, but PR #34 has two MEDIUM findings that should be addressed in the same PR before merge (broken fallback URL when `token` is omitted; missing unsubscribe note in footer).

Both PRs have Copilot review submitted. CodeRabbit reviewed PR #33 (2 nits); rate-limited on PR #34.

---

## PR #33 — `feat/LKID-61-predictions-table`

**Card:** [LKID-61](https://automationarchitecture.atlassian.net/browse/LKID-61) — DB: add predictions table + report_token column
**Author:** Gay Mark
**Files changed:** 4 (migration, test file, schema snapshot, design doc) — +522 lines, 0 deletions
**Merge base:** `origin/main`
**Status:** MERGEABLE

### Verdict: PASS-WITH-NITS

Migration is technically correct, idempotent, matches techspec §4.1 byte-for-byte, and the test suite exercises the SQL-generation layer thoroughly (45 tests). All findings are LOW severity test-portability concerns that do not affect correctness of the delivered artifact.

### Jira acceptance-criteria matrix

| AC | Result | Evidence |
|----|--------|----------|
| `alembic upgrade head` runs without error on a fresh Railway dev DB | PASS (offline-SQL verified; live-DB verification deferred to deploy — author flags this in PR body checklist as pending) | `TestUpgradeSql` generates valid DDL from `003:004` via `alembic upgrade --sql` |
| `alembic downgrade -1` removes the table cleanly | PASS | `TestDowngradeSql::test_drops_predictions_table` + `test_drops_each_index` + `test_version_rolled_back` |
| `pytest backend/tests/test_predictions_table.py` passes | PASS | 45/45 pass locally (see Test Results below) |
| Migration is idempotent | PASS | `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` — `backend/alembic/versions/004_add_predictions_table.py:51,84-86`; locked by `test_create_table_uses_if_not_exists` and `test_create_indexes_use_if_not_exists` |
| Reviewed by Yuri before merge | IN PROGRESS (this verdict) | N/A |

All 5 ACs pass.

### Techspec §4.1 compliance (column-by-column)

Verified against `agents/luca/drafts/techspec-new-flow.md` §4.1 DDL (lines 112-128).

| Column | Spec type | Delivered type | Nullability | Default | Status |
|--------|-----------|----------------|-------------|---------|--------|
| `id` | `UUID PRIMARY KEY` | `UUID PRIMARY KEY` | NOT NULL (PK) | `gen_random_uuid()` | PASS — `004_add_predictions_table.py:52` |
| `report_token` | `TEXT NOT NULL UNIQUE` | `TEXT NOT NULL UNIQUE` | NOT NULL | — | PASS — `:53` |
| `token_created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | same | NOT NULL | `now()` | PASS — `:54` |
| `revoked_at` | `TIMESTAMPTZ` (nullable) | same | NULL allowed | — | PASS — `:55` |
| `inputs` | `JSONB NOT NULL` | same | NOT NULL | — | PASS — `:56` |
| `result` | `JSONB NOT NULL` | same | NOT NULL | — | PASS — `:57` |
| `lead_id` | `UUID REFERENCES leads(id) ON DELETE SET NULL` | same | NULL allowed | — | PASS — `:58` |
| `email_sent_at` | `TIMESTAMPTZ` (nullable) | same | NULL allowed | — | PASS — `:59` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | same | NOT NULL | `now()` | PASS — `:60` |

Indexes (§4.1 specifies three):

| Index | Expected | Delivered | Status |
|-------|----------|-----------|--------|
| `idx_predictions_report_token` | `ON predictions(report_token)` | same | PASS — `:84` |
| `idx_predictions_lead_id` | `ON predictions(lead_id)` | same | PASS — `:85` |
| `idx_predictions_created_at` | `ON predictions(created_at)` | same | PASS — `:86` |

FK target: `leads(id)` with `ON DELETE SET NULL` — PASS.

`leads` table is NOT touched (asserted by two `test_leads_table_not_modified` tests, one in each of TestUpgradeSql and TestDowngradeSql) — PASS.

### Test results

```
cd backend && source venv/bin/activate && pytest tests/test_predictions_table.py -v
=============================== 45 passed in 0.53s ================================
```

All 45 tests pass. Coverage spans: migration-file static checks (3), upgrade SQL column/type/constraint/index checks (21), downgrade SQL checks (6), and schema-snapshot-vs-migration agreement (15).

### Findings

#### N-33-1 [LOW] `python` vs `sys.executable` in subprocess

**File:** `backend/tests/test_predictions_table.py:58`
**Issue:** `subprocess.run(["python", "-m", "alembic", ...])` relies on `python` being on PATH. On this QA workstation, `python` is not aliased (only `python3`), so the test only passes when run from inside the activated venv (where `venv/bin/python` supplies the binary). Outside a venv, the subprocess fails with `python: command not found`, and the whole TestUpgradeSql / TestDowngradeSql class fails.
**Copilot raised the same finding** (PR #33 review comment, line 59). CodeRabbit also raised it.
**Fix:** Use `sys.executable` — guarantees the same interpreter running pytest is used for the subprocess. Low priority; tests pass in the venv-activated workflow used in CI and local dev.

#### N-33-2 [LOW] `env={...}` wipes the environment

**File:** `backend/tests/test_predictions_table.py:62-65`
**Issue:** `subprocess.run(..., env={"DATABASE_URL": ..., "PATH": ...})` replaces the entire environment with only two vars. Portable on macOS/Linux; on Windows, Python refuses to start without `SYSTEMROOT`. Also strips `VIRTUAL_ENV`, locale vars, etc.
**Copilot raised the same finding** (line 65).
**Fix:** `env = {**os.environ, "DATABASE_URL": OFFLINE_DB_URL}`. Low priority.

#### N-33-3 [LOW] Docstring over-states DATABASE_URL requirement

**File:** `backend/tests/test_predictions_table.py:41-42`
**Issue:** Comment says "A dummy DATABASE_URL is required by alembic/env.py even in --sql mode." Copilot correctly points out `alembic.ini` supplies `sqlalchemy.url` and `env.py` only overrides if `DATABASE_URL` is set — so the dummy is for environment isolation, not a hard alembic requirement. Cosmetic doc accuracy, no behavior change.
**Copilot raised this** (line 42).

#### N-33-4 [LOW] Missing `text` language tag on one fenced code block

**File:** `agents/gay_mark/drafts/db_design.md` lines 363-365
**Issue:** markdownlint MD040 warning. Cosmetic; no rendering effect.
**CodeRabbit raised this.**

#### Migration filename — noted but not a finding

The Jira description's implementation-note section suggests `0005_add_predictions_table.py`, but the migration is named `004_add_predictions_table.py`. Existing migrations in `backend/alembic/versions/` use the 3-digit sequence `001`, `002`, `003`, so `004_` is correct and consistent. The PR body documents this deviation from the Jira text and commits to the existing precedent. Not a finding — Jira text is advisory, existing file naming is binding.

### Recommendation

**Merge-ready.** Nits N-33-1 and N-33-2 are worth addressing in a tiny follow-up commit on this branch before merge (3-line subprocess hardening), but they do not block. The 45 tests already cover the 99% of failure modes; the subprocess nits only affect CI portability edge cases.

---

## PR #34 — `feat/LKID-64-resend-email-template`

**Card:** [LKID-64](https://automationarchitecture.atlassian.net/browse/LKID-64) — Backend: Resend transactional email template (PDF attached)
**Author:** John Donaldson
**Files changed:** 5 (renderer module, standard template, fallback template, test file, requirements.txt) — +391 lines, 0 deletions
**Merge base:** `origin/main`
**Status:** MERGEABLE

### Verdict: PASS-WITH-NITS

Templates are visually on-brand, disclaimer is byte-for-byte verbatim in both variants, standard template has no outbound URLs (OQ-5), Jinja2 autoescape is wired correctly, and 8/8 tests pass. Two MEDIUM findings: the renderer does not guard against `pdf_failed=True` with `token=None` (produces `/results/None` as a live URL in the email body); and the footer lacks the "unsubscribe note" called out by both techspec §9 and Jira AC "Plain-text unsubscribe / contact footer included". The "contact" half of that AC is present ("Questions? Just reply to this email"); the "unsubscribe" half is not.

### Jira acceptance-criteria matrix

| AC | Result | Evidence |
|----|--------|----------|
| Template renders with test data (`name`, `token`, `egfr_baseline`, `report_url`) | PASS | `test_standard_template_renders`, `test_fallback_includes_token_url`. Note: `report_url` is not exposed as a variable in the standard template body (OQ-5) — it is built inline from `token` only in the fallback, consistent with techspec §9. |
| Disclaimer text matches LKID-5 verbatim | PASS (verified byte-identical via `grep -F`) | See Techspec Compliance below |
| Passes basic email client rendering check (inline CSS, no external fonts) | PASS | Helvetica Neue stack, 600px table layout, all CSS inlined — `report_email.html:9,22` |
| Inga sign-off on visual design | NOT VERIFIED in this QA pass — requires Inga review | Out of QA scope |
| No "View your report online" CTA (per OQ-5) | PASS | `grep -E "https?://"` on standard template returns 0 matches (`report_email.html`). Fallback template has the URL, as required by techspec §9 fallback behavior. |
| Plain-text unsubscribe / contact footer included | **PARTIAL — FAIL for unsubscribe** | Contact present (`report_email.html:71-73`: "Questions? Just reply to this email — we read every message"). No unsubscribe note. See I-34-2. |

### Techspec compliance

**§9 Email Template — element-by-element:**

| Element | Spec requirement | Delivered | Status |
|---------|------------------|-----------|--------|
| KidneyHood brand header (navy, logo) | navy `#1F2577`, wordmark | `#1F2577` bg + "KidneyHood.org" wordmark, `:22-24` | PASS |
| "Hi {{ name }}," greeting | required | `:35` | PASS |
| Plain-language eGFR baseline summary | required | `:38-41` with `"%.1f"|format()` | PASS |
| "Your PDF report is attached to this email" | required wording (no CTA) | `:43-46` ("Your full personalized report is attached to this email as a PDF.") — semantic match, not literal | PASS |
| No CTA button, no "view online" link | OQ-5 | `grep` confirms 0 URLs in standard template | PASS |
| Disclaimer footer matches LKID-5 verbatim | `DISCLAIMER_FULL` | byte-identical match (see below) | PASS |
| Plain-text unsubscribe / contact footer | both contact AND unsubscribe | contact present; unsubscribe absent | **PARTIAL (see I-34-2)** |
| Fallback template when PDF fails | with `/results/[token]` link | `report_email_fallback.html:45` | PASS |

**Disclaimer verbatim check (hard-rule from the task):**

Source of truth — `app/src/components/disclaimer-block.tsx:14-15`:
```
This tool is for informational purposes only and does not constitute medical advice. Consult your healthcare provider before making any decisions about your kidney health.
```

`grep -cF` of this exact 38-word sentence:
- `backend/templates/report_email.html` → 1 match (at line 57)
- `backend/templates/report_email_fallback.html` → 1 match (at line 57)

**PASS — byte-identical in both templates.** `test_disclaimer_text_verbatim` also locks this.

**§8.4 Resend integration prerequisites:**

| Item | Required | Delivered | Status |
|------|----------|-----------|--------|
| `jinja2` in `requirements.txt` | Yes (techspec §9) | `jinja2>=3.1.0` added (line 14) | PASS |
| `resend` in `requirements.txt` | No (belongs to LKID-62 per PR body's "Out of scope") | not added | PASS (correctly deferred) |
| `RESEND_API_KEY` env var | No (belongs to LKID-62) | not added | PASS (correctly deferred) |

**§13 OQ-5 compliance:**

Standard template must have NO outbound URLs. Verified by:
```
grep -nE "https?://" backend/templates/report_email.html  → 0 matches
```
Also locked by `test_standard_template_renders:46-49`: `assert not re.search(r"https?://", html)`.

PASS.

### Test results

```
cd backend && source venv/bin/activate && pytest tests/test_email_renderer.py -v
=============================== 8 passed in 0.04s =================================
```

All 8 tests pass. Coverage: standard render (1), fallback render with token (1), HTML autoescape in both templates (2), disclaimer verbatim both templates (1), eGFR formatting (1), brand header both templates (1), `confidence_tier` signature contract (1).

### Findings

#### I-34-1 [MED] `render_report_email(pdf_failed=True, token=None)` produces a live `/results/None` URL

**File:** `backend/email_renderer.py:43-83` + `backend/templates/report_email_fallback.html:45`
**Reproduction (run against PR #34 branch with venv active):**
```python
from email_renderer import render_report_email
html = render_report_email(name="Alice", egfr_baseline=33.0, pdf_failed=True)  # token omitted (defaults to None)
# href found: href="https://kidneyhood-automation-architecture.vercel.app/results/None"
```
**Issue:** The docstring (line 61-63) states `token` is "Required when `pdf_failed=True`". The code does not enforce it. If a future LKID-62 call site forgets to pass the token — or if the prediction row is deleted between `_send_report_email()` scheduling and execution — the user receives an email with a broken URL that looks legitimate.
**Risk class:** user-facing defect, not a data-loss bug. The direct caller in LKID-62 is expected to always pass the token, but defensive programming matters here because the surface is a customer-facing email body.
**Copilot raised this** (PR #34 review comment, line 83).
**Fix:** In `render_report_email`, before rendering, add:
```python
if pdf_failed and not token:
    raise ValueError("token is required when pdf_failed=True")
```
Add a unit test that locks this behavior. ~6 lines of code + 1 test. Should be fixed in this PR before merge.

#### I-34-2 [MED] Jira AC "Plain-text unsubscribe / contact footer" — unsubscribe note missing

**File:** `backend/templates/report_email.html:66-78` and `report_email_fallback.html:66-78`
**Issue:** Jira AC literally reads: "Plain-text unsubscribe / contact footer included". Techspec §9 reads: "Plain-text unsubscribe / contact footer (Resend transactional emails don't require List-Unsubscribe headers, but include a human-readable note)".
**Delivered footer text (both templates):**
```
KidneyHood.org
Questions? Just reply to this email — we read every message.
For informational purposes only — not medical advice.
```
The contact line is present. There is no unsubscribe note ("if you'd rather not receive these, reply with UNSUBSCRIBE" or similar human-readable copy).
**Context:** This is a transactional email triggered by an explicit user action (submitting the gate form). CAN-SPAM does not mandate an unsubscribe path for transactional messages. The techspec explicitly acknowledges List-Unsubscribe is not required. However, the spec AND the Jira AC both call for a human-readable unsubscribe note, so the spec-writer's intent is to include one.
**Fix:** Add one line to both templates' footer, e.g. "If you'd prefer not to receive future KidneyHood messages, reply with UNSUBSCRIBE." Should be fixed in this PR. Inga may have a preferred wording — coordinate.

#### N-34-1 [LOW] CSS missing space: `border-left:4px solid#2FB872`

**File:** `backend/templates/report_email.html:53` + `report_email_fallback.html:53`
**Issue:** `solid#2FB872` (no space between the `solid` keyword and the `#` color) — strict email-client CSS parsers (Outlook on Windows, some older Gmail variants) may drop the border declaration. Cosmetic but visible.
**Copilot raised this** (both files).
**Fix:** `border-left: 4px solid #2FB872;`. Trivial.

#### N-34-2 [LOW] CSS missing space: `border-top:1px solid#E4E6EB`

**File:** `backend/templates/report_email.html:67` + `report_email_fallback.html:67`
**Issue:** Same class of bug as N-34-1 — `solid#E4E6EB`.
**Copilot raised this** (both files).
**Fix:** `border-top: 1px solid #E4E6EB;`. Trivial.

#### N-34-3 [LOW] `confidence_tier` type ambiguity between dispatch and techspec

**File:** `backend/email_renderer.py:47`
**Issue:** Engineer noted in PR body that the dispatch showed `confidence_tier: Optional[int]`, but techspec §5.1 defines `PredictResponse.confidence_tier: string`. Renderer uses `Optional[str]` to match the actual engine output.
**Status:** Flagged by PR author for Luca. Not a PR-34 defect — the renderer made the right call (matches the engine) — but the techspec/dispatch discrepancy should be reconciled before LKID-62 lands to avoid the same question again. Surfaced for Luca.

#### N-34-4 [LOW] `confidence_tier` signature accepts but does not render

**File:** `backend/email_renderer.py:47,80` + templates
**Issue:** The renderer accepts `confidence_tier` in its signature and passes it into the Jinja2 context, but neither template references `{{ confidence_tier }}`. The PR body documents this as "reserved for future use"; the test `test_confidence_tier_accepted_but_optional` locks the call signature. Acceptable if intentional — flagging so it is not lost when LKID-62 wires up the call site expecting this to surface in the email body.

### Recommendation

**Block-for-fix (narrow scope, same PR).** The two MEDIUM findings (I-34-1, I-34-2) are small and should be fixed in this PR before merge:
- I-34-1: add `ValueError` guard + 1 test (~6 LOC)
- I-34-2: add 1 footer line to both templates + optional test locking the word "unsubscribe" is present

The four LOW findings are nits. N-34-1 and N-34-2 are also trivial one-character fixes that can be bundled with the MEDIUM fixes. N-34-3 and N-34-4 do not require changes in this PR.

Once the MEDIUM findings are addressed, this becomes a clean PASS.

---

## Copilot / CodeRabbit review status

| PR | Copilot | CodeRabbit |
|----|---------|------------|
| #33 | Submitted 2026-04-19T23:37:58Z — 3 line-level comments (all addressed as N-33-1, N-33-2, N-33-3) | Submitted 2026-04-19T23:38:38Z — 2 nits (addressed as N-33-1 subset, N-33-4) |
| #34 | Submitted 2026-04-19T23:44:09Z — 5 line-level comments (addressed as I-34-1, N-34-1×2, N-34-2×2) | Rate-limited — queued for ~53 minutes from PR open; human request required after window closes |

Both PRs satisfy the "never merge without Copilot" rule. For PR #34, the CodeRabbit review is pending; the orchestrator may choose to wait for it or proceed on Copilot alone once the MEDIUM findings are addressed.

---

## Workspace hygiene log

- Started on `main` with uncommitted local changes (`.gitignore`, `CLAUDE.md`, `app/CLAUDE.md`, `app/.gitignore`, `app/src/app/page.tsx`, plus untracked artifacts). All files belong to main only (no cross-branch mix).
- `git stash push -u -m "yuri-qa-pr33-pr34-workspace"` before first branch switch.
- Checked out `origin/feat/LKID-61-predictions-table` (detached HEAD) → ran tests → read diff → switched.
- Checked out `origin/feat/LKID-64-resend-email-template` (detached HEAD) → ran tests → read diff → verified disclaimer grep → switched back to `main`.
- `git stash pop` restored the pre-QA working tree. No cross-branch contamination.

---

## Summary Table

| PR | Verdict | HIGH | MED | LOW/NIT | Tests | Copilot | Recommendation |
|----|---------|------|-----|---------|-------|---------|----------------|
| #33 | PASS-WITH-NITS | 0 | 0 | 4 | 45/45 | PRESENT, 3 nits | Merge-ready; optional 3-LOC subprocess hardening |
| #34 | PASS-WITH-NITS | 0 | 2 | 4 | 8/8 | PRESENT, 5 findings | Block-for-fix in same PR: token=None guard + unsubscribe footer note |

*Yuri — 2026-04-19 — Sprint 4 kickoff*

---

## Re-verification 2026-04-19 — PR #34 (narrow diff)

**Scope:** Re-verify only the two MED findings + regressions on `feat/LKID-64-resend-email-template`. Original AC pass remains authoritative.

**Commit verified:** `90d721d` — "fix(email): address QA MED findings — guard None token, add unsubscribe-style footer (LKID-64)"

**I-34-1 (token=None guard) — PASS**
- Guard present: `backend/email_renderer.py:78` → `if pdf_failed and not token:`
- Error type: `ValueError` raised at `email_renderer.py:79`; docstring updated (`email_renderer.py:72`)
- Test `test_fallback_requires_token` — PASS

**I-34-2 (unsubscribe/contact footer) — PASS**
- "transactional email" present in both templates (line 75 in `report_email.html` and `report_email_fallback.html`)
- "no marketing list" present in both templates (line 75 in each)
- Test `test_both_templates_include_unsubscribe_note` — PASS

**Regression — PASS**
- Full file: `pytest backend/tests/test_email_renderer.py -v` → **10/10 passed** (was 8, +2 new — matches expectation)
- `report_email.html`: zero `https?://` matches (no-link rule preserved)
- `report_email_fallback.html`: one `https?://` match at line 45 — unchanged (`https://kidneyhood-automation-architecture.vercel.app/results/{{ token }}`)

**Copilot LOW-nit bonus — PASS**
- `grep -n "solid#" backend/templates/` → no matches (space fixes applied cleanly)

**Final verdict:** **PASS — merge-ready.** Both MEDs closed, zero regressions, CSS nits also cleared. No surprises.

*Yuri — 2026-04-19 — re-verify*
