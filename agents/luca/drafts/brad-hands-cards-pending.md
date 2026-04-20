# Brad-Hands Jira Cards — Ready to File

Cloudflare is rate-limiting the Atlassian MCP after filing LKID-83/84/85. Three cards still to file. Copy-paste into Jira's "Create issue" form (Project: LKID, Issue type: Task) when MCP is back or file manually.

All three should be labeled `brad-hands`.

---

## Card 1 — DNS flip to kidneyhood.org + set NEXT_PUBLIC_APP_URL

**Labels:** `brad-hands`, `dns`, `seo`
**Priority:** Medium

### Description

**What**

Point `kidneyhood.org` at the Vercel deployment and set `NEXT_PUBLIC_APP_URL` so SEO canonical URLs (sitemap, robots, OG, JSON-LD) use the real domain instead of the Vercel preview URL.

**Steps**

1. Vercel → `kidneyhood` project → Settings → Domains → Add `kidneyhood.org` + `www.kidneyhood.org`
2. Add the A record (`76.76.21.21`) + CNAME for www at the registrar
3. Wait for Vercel verification (<10 min typical)
4. Set env var on Production + Preview: `NEXT_PUBLIC_APP_URL` = `https://kidneyhood.org`
5. Redeploy main to pick up the new canonical URL in metadataBase/sitemap/robots/OG

**Acceptance**

- [ ] `https://kidneyhood.org` resolves to production (SSL from Vercel)
- [ ] `curl https://kidneyhood.org/sitemap.xml` returns XML with kidneyhood.org URLs
- [ ] OG image URL + JSON-LD `publisher.url` on landing use `https://kidneyhood.org`
- [ ] LinkedIn / Twitter / Facebook preview debuggers render the OG card correctly

**References**

- LKID-73 SEO card — base URL is env-driven, so this is a one-line env flip
- `app/src/app/layout.tsx` `metadataBase`

---

## Card 2 — Flip CSP from Report-Only to enforcing mode

**Labels:** `brad-hands`, `security`
**Priority:** Medium

### Description

**What**

After a 72-hour clean Report-Only window, flip the Content-Security-Policy header from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` on both frontend (Vercel / `next.config.ts`) and backend (Railway / FastAPI middleware).

**Prerequisites (the 72-hour verification window per LKID-74)**

During the 72h after the PR #63 deploy, confirm each of these works on prod:

- [ ] Sentry captures a test error (browser console → Sentry issue appears)
- [ ] PostHog fires the 4 funnel events (`labs_submitted`, `gate_captured`, `results_viewed`, `pdf_downloaded`) on a full flow walk
- [ ] Manrope (H1s) + Nunito Sans (body) render correctly — inspect Network tab or `getComputedStyle(document.body).fontFamily`
- [ ] Clerk login on `/client/lee-a3f8b2` works without redirect loop
- [ ] PDF download round-trip works end-to-end
- [ ] **Browser console** shows no real `Content Security Policy` violations for the 72-hour window

If any of these fail, the CSP needs a whitelist adjustment *before* flipping to enforcing mode.

**Address the 3 Yuri-logged nits first**

1. Cosmetic docstring fix in `next.config.ts`
2. Hardcoded `BACKEND_HOST` will noisy-up dev/preview CSP reports (make env-driven)
3. FastAPI `/docs` + `/redoc` will break under backend's `default-src 'none'` — either disable Swagger UI in prod OR add `/docs` allowance to the backend CSP

**Steps**

1. Open a new PR `fix/LKID-86-csp-enforcing` branched off main
2. In `next.config.ts`: rename `Content-Security-Policy-Report-Only` → `Content-Security-Policy`
3. In `backend/main.py` middleware: same rename on the backend header
4. Address the 3 nits above in the same PR
5. Standard QA + merge chain
6. Watch for any enforcing-mode breakage for 24h post-deploy

**Acceptance**

- [ ] `curl -I https://<prod>/` shows `Content-Security-Policy:` (not `-Report-Only`)
- [ ] `curl -I https://<backend>/health` same on backend
- [ ] App still functions fully end-to-end (same 6-step walkthrough as above)
- [ ] Lee can log in and the dashboard still loads (Clerk)
- [ ] No CSP errors in browser console for 24h after flip

**References**

- LKID-74 Jira comment — full 6-step post-merge verification checklist
- `agents/yuri/drafts/sprint5-pr63-qa-verdict.md` — the 3 nits

---

## Card 3 — Send Sprint 5 update email to Lee

**Labels:** `brad-hands`, `client-comms`
**Priority:** Low

### Description

**What**

Send the already-drafted Sprint 5 update email to Lee. Draft is at `agents/husser/drafts/email-to-lee-sprint5-update.md`.

**Copy status**

The draft is current as of 2026-04-20. It covers:

- The app being live end-to-end with the tokenized flow
- Lee's engine running in production (0.31-coefficient model, all decline rates confirmed, BUN structural floor, age attenuation, creatinine max)
- Link to the client dashboard
- Sprint 5 Launch Readiness summary (Sentry, PostHog, Results + chart redesign, dashboard v2)
- A small ask: click through and flag anything off

**The chart is now live with the redesigned visuals**, so the "chart is being reworked" hedge I previously added can be removed before sending. Re-read the draft before hitting send — if anything reads stale, update inline.

**Steps**

1. Re-read `agents/husser/drafts/email-to-lee-sprint5-update.md`
2. Update any stale hedging (the chart reworded copy in particular — it's shipped now)
3. Copy into Gmail / your email client of choice
4. Send to Lee
5. Mark this ticket Done

**Acceptance**

- [ ] Email sent to Lee
- [ ] Draft updated in repo if edits were made (nice-to-have)
- [ ] If Lee replies with feedback, file follow-up tickets as needed

---

## Running brad-hands backlog (all items)

Filed Jira cards, with status:

| Key | Item | Priority | Status |
|-----|------|----------|--------|
| LKID-47 | Klaviyo Flow dashboard config (engineering shipped; Flow setup pending) | — | To Do |
| LKID-83 | Set PostHog env vars on Vercel | High | To Do |
| LKID-84 | Set Sentry env vars on Vercel + Railway | High | To Do |
| LKID-85 | Resend DNS + flip FROM email | High | To Do |
| LKID-86 (pending) | DNS flip to kidneyhood.org | Medium | Not yet filed |
| LKID-87 (pending) | Flip CSP to enforcing mode | Medium | Not yet filed (72h window first) |
| LKID-88 (pending) | Send Sprint 5 email to Lee | Low | Not yet filed |
