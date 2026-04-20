# Brad Action Setup Guide — Sprint 4 Remaining Items

**Owner:** Brad (human-only actions) • **Drafted by:** Luca • **Date:** 2026-04-19

Purpose: when you reopen this tomorrow or next week, follow this checklist top-to-bottom. Every command is copy-paste ready. Values you must provide are marked `<like-this>`.

---

## TL;DR — one-liner for your todo app

> Sprint 4 close: (1) Resend domain + API key + Railway vars, (2) Klaviyo DNS + profile schema + draft Flow, (3) email Lee for chart-color sign-off (optional: share LKID-68 postmortem TL;DR), (4) delete duplicate Postgres service in Railway, (5) gitignore `docs/client-comms/`.

---

## Section 1 — Resend (transactional email with PDF attachment)

**Goal:** make `POST /leads` actually send the results email with the PDF attachment via Resend.

**Ticket:** feeds into the tokenized flow (LKID-62) — backend code already calls Resend fire-and-forget; just needs the API key + verified domain.

### 1.1 Create account + verify domain
1. Sign up at https://resend.com (use `brad@automationarchitecture.ai`).
2. Dashboard → **Domains** → **Add Domain** → enter `kidneyhood.org`.
3. Resend will display a table of DNS records. Keep this tab open.

### 1.2 Add DNS records at the registrar for `kidneyhood.org`
Copy the records **exactly as Resend shows them** — do NOT invent values. Expect roughly:
- **MX** (for return-path / bounce handling): `send.kidneyhood.org` → `feedback-smtp.<region>.amazonses.com` priority `10`
- **TXT (SPF)** on `send.kidneyhood.org`: `v=spf1 include:amazonses.com ~all`
- **TXT (DKIM)** on `resend._domainkey.kidneyhood.org`: the long `p=MIGfMA0...` value Resend provides
- **TXT (DMARC, optional but recommended)** on `_dmarc.kidneyhood.org`: `v=DMARC1; p=none;`

Paste each row into the DNS registrar (Cloudflare / GoDaddy / wherever `kidneyhood.org` lives). Exact host/value strings come **from Resend's UI** — copy-paste only.

Click **Verify DNS Records** in Resend. Propagation is usually under 10 minutes.

### 1.3 Create API key
Dashboard → **API Keys** → **Create API Key** → name it `kidneyhood-prod` → permission `Sending access` → copy the `re_...` value. You will not be able to view it again.

### 1.4 Set Railway env vars
From the repo root:
```bash
cd backend
railway variables --set "RESEND_API_KEY=<paste-re_key-here>"
railway variables --set "RESEND_FROM_EMAIL=reports@kidneyhood.org"
railway variables --set "PUBLIC_APP_URL=https://kidneyhood-automation-architecture.vercel.app"
```
(Variable names match `backend/.env.example` lines 11–15. If you prefer a different sending address, set `RESEND_FROM_EMAIL` accordingly — but it must be under the verified domain.)

### 1.5 Redeploy backend
```bash
cd backend
railway up --detach
```
(`preDeployCommand` auto-runs alembic; no manual migration step.)

### 1.6 Verify end-to-end
1. Hit the live app, submit a prediction, then submit the lead form with an inbox you control (your own email, not `ci-smoke@kidneyhood.org`).
2. Within ~30 seconds, an email with the PDF attachment should arrive from `reports@kidneyhood.org`.
3. If nothing arrives in 2 min:
   ```bash
   railway logs --service <backend-service> | grep -i resend
   ```
   Look for `resend_send_ok` or an error line.

---

## Section 2 — Klaviyo

### 2a. DNS for Klaviyo sending subdomain

1. Klaviyo dashboard → **Account** → **Settings** → **Domains and Hosting** → **Add a Dedicated Sending Domain**.
2. Enter a subdomain like `kl.kidneyhood.org` (Klaviyo recommends a subdomain distinct from your transactional sender; do not reuse `send.kidneyhood.org`).
3. Klaviyo generates 4–5 CNAME + TXT records. Copy them exactly as shown.
4. Paste each record into the DNS registrar for `kidneyhood.org`.
5. Return to Klaviyo and click **Verify**. Propagation usually 10–60 min.
6. Once verified, set the dedicated domain as the **default sending domain** for the account.

### 2b. Profile + Event schema (LKID-47)

In Klaviyo: **Profiles → Profile Properties** — ensure these custom properties exist (create if missing):

| Property name | Type | Example |
|---|---|---|
| `egfr_baseline` | number | `42` |
| `confidence_tier` | number | `1` or `2` |
| `bun_tier` | string | `"≤12"`, `"13–17"`, `"18–24"`, `">24"` |
| `report_token` | string | 32-char hex |

Then confirm the `Prediction Completed` event is accepted:

1. Klaviyo dashboard → **Analytics → Metrics** — look for `Prediction Completed`. If missing, it will auto-create the first time the backend fires an event.
2. Fire a test event from Klaviyo's **API Playground** (or `curl`) using the techspec §8.5 payload shape:
   ```json
   {
     "data": {
       "type": "event",
       "attributes": {
         "profile": {"data": {"type": "profile", "attributes": {"email": "<your-test-inbox>"}}},
         "metric":  {"data": {"type": "metric",  "attributes": {"name": "Prediction Completed"}}},
         "properties": {
           "egfr_baseline": 42,
           "confidence_tier": 1,
           "bun_tier": "13–17",
           "report_token": "test-token-abc"
         }
       }
     }
   }
   ```
3. Confirm the event shows in **Analytics → Metrics → Prediction Completed → Activity Feed** within a minute.

Also verify the Railway env var is set (backend expects `KLAVIYO_PRIVATE_API_KEY`, per `backend/.env.example` line 18):
```bash
cd backend
railway variables | grep KLAVIYO
# If missing:
railway variables --set "KLAVIYO_PRIVATE_API_KEY=<pk_-key-from-klaviyo>"
railway up --detach
```
> Note: CLAUDE.md currently refers to this as `KLAVIYO_API_KEY` — the backend actually reads `KLAVIYO_PRIVATE_API_KEY`. Use the latter.

### 2c. Warm-campaign Flow

1. Klaviyo dashboard → **Flows** → **Create Flow** → **From scratch** → Trigger: **Metric** → `Prediction Completed`.
2. Build the cadence (suggested):
   - **Day 0 (immediate)** — welcome / "we sent your PDF report" (one-liner, no PDF re-send). Include `{{ event.bun_tier }}` for light personalization.
   - **Day 3** — "How to read your eGFR trajectory" (educational, non-clinical).
   - **Day 10** — "5 lifestyle levers backed by research" (tip cadence).
   - **Day 30** — follow-up: "Want to re-check your numbers?" (CTA back to the app).
   - Do NOT re-attach the PDF — Resend already delivered it in section 1.
3. Leave Flow in **Manual / Draft** status. Do NOT click "Live" until you're ready to commit to the email sequence.
4. Create a suppression segment:
   - **Lists & Segments** → **Create Segment** → name it `CI / QA Suppression`.
   - Condition: `email contains "ci-smoke@kidneyhood.org"` OR `email contains "+ci@"`.
   - In the Flow, **Filters** → **Exclude from flow if profile is in segment** → `CI / QA Suppression`.

---

## Section 3 — Lee sign-off requests

### 3a. Chart color palette (LKID-67, Inga's half)

1. Take a fresh screenshot:
   - Open https://kidneyhood-automation-architecture.vercel.app in a browser.
   - Submit a sample prediction (any valid numbers) to land on the results page.
   - Screenshot the full chart + legend — save as `~/Desktop/kidneyhood-chart-<date>.png`.
2. Send this email (edit before sending):

---

**To:** lee@kidneyhood.org
**Subject:** Quick visual sign-off — KidneyHood chart colors

Hi Lee,

We updated the chart trajectory colors to meet WCAG AA contrast standards (required for accessibility compliance). The new palette is:

- BUN ≤12 (best case): emerald green (`#047857`)
- BUN 13–17: sky blue (`#0369A1`)
- BUN 18–24: amber (`#B45309`)
- No Treatment: dark slate (`#374151`)

Rationale: we chose charcoal (not red) for No Treatment to avoid a color clash with the dialysis-threshold marker (which is already red). The green → blue → amber progression tells the story without overclaiming danger.

Can you confirm these read correctly from a clinical standpoint? No change needed if they look right to you. If you'd prefer a different palette, let us know.

(Screenshot attached.)

Thanks,
Brad

---

### 3b. Empty-DB postmortem (LKID-68) — **your call whether to share**

Reference: `agents/luca/drafts/lkid-68-postmortem-synthesis.md`. If you decide to share with Lee, frame it FYI-only:

> **Subject:** FYI — internal deploy gap caught pre-launch (no action needed)
>
> Hi Lee,
>
> Quick heads-up: our pre-launch check caught a missed prod database migration before any patient used the site — no data impact. We've added automated migrations at deploy, a post-deploy smoke test, and a 6-hour heartbeat so it can't recur. Sharing for transparency; no action needed on your end.
>
> — Brad

If you'd rather keep it internal, skip — the postmortem lives in the repo for our own records.

---

## Section 4 — LKID-69 (duplicate Postgres deletion)

Railway has two Postgres services. `Postgres-726n` is the live one; `Postgres` is the empty duplicate that was created accidentally.

**Before deleting, re-verify it's actually empty.** Services can get accidentally re-linked.

1. Double-check which service `DATABASE_URL` currently points to:
   ```bash
   cd backend
   railway variables | grep DATABASE_URL
   # The host/port in the value tells you which service is active.
   ```
2. Connect to the OTHER (non-active) Postgres and confirm no tables:
   ```bash
   railway connect Postgres      # picks the non-726n service by name
   \dt                           # expect: "Did not find any relations."
   \q
   ```
   If it shows tables, **STOP** — that means the duplicate is actually in use. Escalate before deleting.
3. If confirmed empty, delete via dashboard or CLI (check Railway CLI current syntax — `railway service delete` may require an interactive confirm or the `--service` flag):
   ```bash
   railway service delete Postgres
   # If the CLI version doesn't support delete, do it from the Railway web dashboard:
   # Project → Postgres (not -726n) → Settings → Danger → Delete Service.
   ```
4. Post-delete verification:
   ```bash
   cd backend
   railway variables | grep DATABASE_URL    # should still resolve to Postgres-726n
   curl -fsS https://<backend-url>/health   # expect 200 OK
   ```
5. Update **LKID-69** in Jira with a comment: "Duplicate service deleted on <date>. `/health` 200. `DATABASE_URL` unchanged." → transition to **Done**.

---

## Section 5 — `docs/client-comms/` decision

Seven Fireflies/Granola meeting transcripts have been sitting in `docs/client-comms/` (untracked) since 2026-04-19.

**Recommended: Option A (gitignore) for MVP.**

```bash
cd /Users/brad/Documents/aaa/Client\ Projects/KidneyHood/repo/LKID
printf "\n# Client meeting transcripts — keep local-only\ndocs/client-comms/\n" >> .gitignore
git add .gitignore
git commit -m "chore: gitignore docs/client-comms/ (client confidentiality)"
git push origin main
```

Alternatives if you change your mind later:
- **B. Commit as-is** — gives agents context but exposes transcripts to anyone with repo access.
- **C. Redact + commit** — extract key decisions into `docs/client-context.md`, gitignore the raw transcripts. Best long-term but requires a pass to redact.

---

## Section 6 — Sprint 4 open-items summary

| # | Item | Status | Unblocker |
|---|---|---|---|
| 1 | **Resend setup** (domain, API key, Railway vars, smoke test) | Not started | Section 1 |
| 2 | **LKID-47 Klaviyo** — DNS, profile schema, Flow draft | Blocked on DNS + schema | Section 2 |
| 3 | **LKID-67 chart colors** — Lee sign-off | Email drafted; needs screenshot + send | Section 3a |
| 4 | **LKID-68 postmortem** — share with Lee? | Your call | Section 3b |
| 5 | **LKID-69 duplicate Postgres** — delete | Ready; needs re-verify empty | Section 4 |
| 6 | **`docs/client-comms/`** decision | Recommended: gitignore | Section 5 |

### Open questions from the LKID-68 postmortem (Brad needs to answer)
See `agents/luca/drafts/lkid-68-postmortem-synthesis.md` for context. Five open items flagged there are not blocking for Sprint 4 close, but should be triaged before the next sprint kickoff.

---

## What counts as "done" for Sprint 4

- [ ] Resend verified, test email with PDF received (Section 1.6)
- [ ] Klaviyo domain verified + `Prediction Completed` test event seen in Klaviyo (Section 2b)
- [ ] Klaviyo Flow drafted (in **Manual/Draft** — NOT live) (Section 2c)
- [ ] Lee email sent for chart colors (Section 3a)
- [ ] Decision made on LKID-68 postmortem share (Section 3b)
- [ ] Duplicate Postgres deleted, `/health` 200, LKID-69 closed (Section 4)
- [ ] `.gitignore` updated for `docs/client-comms/` (Section 5)

Once all boxes are checked: Sprint 4 retro, then plan Sprint 5.
