# Sprint 5 Scope Proposal

**Prepared by:** Luca (CTO)
**Date:** 2026-04-20
**Status:** Draft — awaiting Brad selection of theme before planning

---

## Context

Sprint 4 shipped end-to-end in ~24 hours (vs. 2-week plan). The app is functionally complete: landing → labs → gate → results → PDF + Resend email + Klaviyo event, guarded by G1/G2/G3. Real users can use it *today* from the operational perspective — the remaining gaps are ops (DNS, Klaviyo Flow) and polish (analytics, monitoring, Lee sign-offs), not product.

Sprint 5 should pick a coherent theme rather than a grab bag. Three candidates below, in descending order of my recommendation.

---

## Theme A — Launch Readiness (recommended)

**Goal:** Flip from "works" to "launched." Everything needed to announce the app publicly to kidney patients.

### Candidate cards

- **LKID-71** (new) — PostHog analytics: track landing view, `/labs` submit, gate submit, results view, PDF download, drop-off rates per step. Enables the conversion funnel Lee will want to see.
- **LKID-72** (new) — Error monitoring (Sentry or similar): backend exceptions, frontend runtime errors, unhandled promise rejections. Complements G2/G3 which only catch the happy path.
- **LKID-73** (new) — SEO basics: Open Graph meta tags on landing, `/labs`, `/results/[token]` (with `noindex` on the last), sitemap.xml, robots.txt, structured-data JSON-LD if appropriate. Currently zero SEO surface.
- **LKID-74** (new) — CSP + security headers: content-security-policy, strict-transport-security, x-frame-options, permissions-policy. Table-stakes for a health-adjacent site.
- **LKID-75** (new) — Dashboard v2 for Lee: conversion funnel, recent leads, email-sent counts, Klaviyo-event counts, rough opt-in rate — read-only, refreshes every 10 minutes.
- **Rollover from Sprint 4:**
  - LKID-68 remaining AC (postmortem sign-off) — owner: Brad
  - LKID-69 dup Postgres cleanup — owner: Brad (or dispatch once approved)
  - LKID-47 Klaviyo Flow dashboard config — owner: Brad

### Estimated sprint size

5 new cards + 3 rollovers. Roughly a 1-week scope at agent-autonomous velocity.

### Why I recommend this

The app is launch-ready from a feature standpoint. What it lacks is the measurement + safety + discoverability layer that makes launch observable. Without PostHog, we can't answer "is the funnel converting?" When a real user hits a runtime error, we won't know. Sentry + PostHog are foundational; they should precede launch, not follow it.

---

## Theme B — Observability (alternative)

**Goal:** Build the measurement layer before building anything else.

### Candidate cards

- LKID-71 PostHog analytics (same as Theme A)
- LKID-72 Error monitoring (same as Theme A)
- LKID-76 (new) — structured application logs (JSON) + log aggregation (pick a backend: Better Stack, Axiom, or Railway's native logs view)
- LKID-77 (new) — Railway resource monitoring: memory/CPU/disk alerts, DB connection pool saturation
- LKID-78 (new) — Slack/email alerts for G2+G3 failures (currently silent if a cron run fails)

### Tradeoff vs Theme A

Pure-measurement theme. Delivers less user-visible polish but creates a stronger foundation for every subsequent sprint. Recommend only if launch is ≥2 weeks out.

---

## Theme C — Content & Brand (alternative)

**Goal:** Inga+Harshit polish pass on every user-facing surface.

### Candidate cards

- LKID-79 (new) — Inga audit of `/labs`, `/gate/[token]`, `/results/[token]` microcopy and visual hierarchy. Identify friction points and propose fixes.
- LKID-80 (new) — Landing page content revision: replace placeholder stat-card numbers (33 / 25.9 / -7.8 from the design handoff) with real example data from Lee's clinical pool; consider real couple photo.
- LKID-81 (new) — Email template visual pass: Inga reviews the stopgap-wired transactional email, may want richer layout / additional educational content.
- LKID-82 (new) — Mobile optimization pass: the landing page works on mobile, but `/labs` form + `/gate/[token]` have not been specifically tuned for small viewports. Yuri + Inga joint review.
- LKID-83 (new) — Multilingual support feasibility: is Spanish demand present? Investigate framework (Next.js i18n routing) + cost.

### Tradeoff vs Theme A

Higher user-experience investment, lower infrastructure investment. Worth prioritizing if Lee's user research shows content is the friction, not plumbing.

---

## Cross-cutting items (Sprint 5 includes regardless of theme)

- **G2/G3 alerting** — if a scheduled run fails, it silently becomes a red check on the Actions tab. A Slack webhook or email notification should fire. Small (1-2 hours of work).
- **Update techspec doc** — `agents/luca/drafts/techspec-new-flow.md` is Sprint 4 frozen; Sprint 5 should either extend it (if the changes fit the tokenized-flow model) or open a new techspec.
- **Sprint retrospective cadence** — formalize that Husser writes a retro within 48 hours of sprint close. Sprint 4 retro shipped same-day because we're all in the same agent context; future sprints may not be so linear.

---

## Recommendation

**Go with Theme A (Launch Readiness).** The app is at the painful inflection point where the next hour of work on plumbing is worth less than the first hour of work on measurement + safety. Launch-prep scope is 5 cards, manageable in a week.

If launch timing is >3 weeks out and you want to invest in foundation first, **Theme B** is defensible. Theme C is better as Sprint 6 once we have measurement to know what UX polish is most impactful.

---

## Open questions for Brad

1. **When is launch?** Sprint 5 scope flexes on this. If weeks out, Theme A or B. If tomorrow, Sprint 5 is basically "do LKID-47 Flow and press go."
2. **Analytics provider preference?** PostHog is the default assumption (self-hostable, good for product). Alternatives: Plausible (privacy-focused, lighter), Mixpanel (paid), Google Analytics (not ideal for health). Speak now or I'll proceed with PostHog.
3. **Error monitoring provider?** Sentry is the default. Alternative: Rollbar, Honeybadger, or Railway/Vercel native tools. Sentry has the richest frontend + backend integration.
4. **Lee involvement for Dashboard v2?** Sprint 5 Theme A includes a Lee-specific dashboard (LKID-75). Is he asking for specific views, or is a "show me the funnel" overview enough for v1?
5. **HIPAA posture.** Launch-prep implies real patients. We should explicitly decide whether we're claiming HIPAA compliance and, if so, what that requires (BAAs with Resend + Klaviyo + Railway + Vercel, encryption-at-rest audits, etc.). Currently we have Yuri's pre-consent HIPAA note (`agents/yuri/drafts/hipaa-verification-notes.md`); a formal posture decision is overdue.

---

## Next steps

- **Brad reviews this doc + answers the 5 questions above** (or says "go with Theme A defaults").
- Upon selection, Husser creates the Sprint 5 cards with labels, priorities, dependencies.
- Luca opens the Sprint 5 techspec (or extension to the Sprint 4 techspec).
- First ticket dispatches.
