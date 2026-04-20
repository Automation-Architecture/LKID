**Subject:** KidneyHood update — live app, your engine, and what's next

Hi Lee,

Quick update on where we are. The short version: the app is live, your engine is powering it, and we're in the polish-for-launch phase.

**The app is live**

You can use the full patient flow right now:

[https://kidneyhood-automation-architecture.vercel.app](https://kidneyhood-automation-architecture.vercel.app)

Landing → enter labs → email gate → personalized results with scenario projections → PDF download + email confirmation. End-to-end, no sign-up friction.

One heads-up: the multi-scenario trajectory chart on the results page is currently being reworked to match the finalized design. The underlying engine math is correct and powering every projection you see in the results cards — the visualization is what's being polished. I'll flag when the final chart ships.

**Your engine is in production**

Every clinical decision you made is now running in the live app:

- Phase 1 formula rebuilt around the 0.31-coefficient model (your golden vectors from April 2)
- All decline rates confirmed and locked in (Stage 3a/3b/4/5 + post-decline path at -0.33/yr from your pilot data)
- BUN structural floor with the lookup table
- Dialysis threshold at eGFR 12
- Creatinine max at 20.0, age attenuation live

Golden-vector regression tests run on every deploy — if anyone ever changes the math, CI catches it before it ships.

**Your dashboard is current**

[https://kidneyhood-automation-architecture.vercel.app/client/lee-a3f8b2](https://kidneyhood-automation-architecture.vercel.app/client/lee-a3f8b2)

Sprint 4 is marked complete; Sprint 5 progress is visible in real time. It auto-refreshes every 6 hours.

**What's next (Sprint 5 — Launch Readiness)**

We're now building the measurement + safety layer so we can announce this publicly with confidence:

- Error monitoring (Sentry) — shipped this week
- Conversion funnel analytics (PostHog) — in code review
- SEO + security headers — up next
- A v2 of your dashboard — conversion funnel, recent leads, email-open rate, so you'll see live adoption data once we launch

**One small ask**

When you get a chance, click through the live flow and let me know if anything reads off — copy, chart labels, recommendations, anything. Small fixes now are cheaper than after launch.

Talk soon,
Brad
