---
title: "Week 1 — Design Sprint"
date: 2026-03-26
sprint: 1
highlights:
  - "7 prototype screens built and deployed — real Next.js components, not mockups"
  - "QA pass complete — 7 issues found, all resolved"
  - "Server-side calc spec received and corrections acknowledged"
  - "Potassium field removed per v2.0 spec; eGFR threshold corrected to 12"
  - "5 of 8 design sprint PRs merged; form validation and accessibility shipped"
---

## Product Update — Husser

Lee, welcome to the first weekly update. This is where we show our work, and I want to start by saying: the team moved fast this week. Sprint 1 was our Design Sprint — the goal was to go from a blank repository to something you can actually click through and react to. We hit that goal.

### What We Built

Seven prototype screens are live on Vercel right now. Not wireframes, not static images — these are real Next.js components with real routing that you can click through in your browser. The full journey is there: Landing page, Email Entry, Magic Link Sent, Expired Link, Prediction Form, Loading, and Results.

Here is what that means in practice. You land on the homepage, hit "Get Started," enter an email address, and see the magic link confirmation screen — complete with deep-link buttons for Gmail and Outlook, because we know your target patients are 60 and older and we are not going to make them hunt through their inbox. From there, the flow moves to the Prediction Form (with three lab value fields — BUN, Creatinine, and Age), through a loading state, and into the Results page where the chart and PDF download button live.

Every screen is responsive across mobile, tablet, and desktop. Every button meets the 44-pixel touch target minimum. Every input field uses 16-pixel font so iOS does not zoom on focus — a small detail that matters a lot for older users on phones.

These screens were built across five Jira cards (LKID-31 through LKID-35). Inga revised the user flows, wireframes, and component specs. Harshit scaffolded the Next.js app and built all seven screens. Five of eight design sprint PRs are merged, with form validation (LKID-36) and the accessibility baseline (LKID-37) also shipped.

### Quality Check

Before anything moved to Done, Yuri — our QA lead — reviewed all five design sprint cards against the specs. Three cards passed clean. Two passed with conditions, meaning minor issues that needed fixing before we could call them complete.

In total, Yuri found seven issues: three medium severity and four low. The medium ones were a missing accessibility label on the header logo, form field validation ranges that did not match the component specs (BUN minimum was 0 instead of 5, creatinine range was off), and the PDF download button being permanently disabled instead of showing a simulated loading state. All seven issues were resolved in a follow-up commit. No hard blockers. The prototype is clean.

This is the quality bar we are holding ourselves to — every card gets a QA review against the acceptance criteria before it closes.

### Your Calc Spec

We received your server-side calculation specification, and the team has reviewed it carefully. I want to acknowledge a few things specifically so you know we are paying attention.

First, the eGFR threshold. Your spec corrects this to 12, not 15. Noted and adopted — our implementation will use 12. Second, potassium has been removed from the rules engine inputs. The potassium field has been removed from the prototype form per your v2.0 spec. The prediction form now takes three lab inputs: BUN, creatinine, and age.

Your Section 3 rules engine maps directly to LKID-14, which is the card where we implement the actual prediction logic in Sprint 2. That is the heart of the product — where your algorithm turns lab values into trajectories — and it is the single most important card in the backlog. The BUN suppression estimate you described in Section 3.7 is a new addition we had not scoped; we are tracking it and will discuss how it fits during Sprint 2 planning.

There are five items from your spec where we need your input before we can finalize the implementation. Those are queued for Sprint 2 and we will reach out with specific questions.

### Scope Discipline

One thing I want to highlight, because it speaks to how we are protecting your timeline and budget. The original product requirements document had 89 Jira tickets, 12 API endpoints, 5 database tables, and around 40 frontend components. The Lean Launch PRD — which is the binding scope document for this build — cut that down to roughly 38 tickets, 5 endpoints, 1 database table (plus Clerk for auth), and 21 components.

That is not corner-cutting. That is focus. KidneyHood is a lead generation tool, not a patient portal. A patient enters their lab values, sees their eGFR trajectory chart, downloads the PDF, and in doing so gives you their name and email for a warm outreach campaign. Every feature we kept serves that loop. Everything we deferred — user accounts, dashboards, multi-visit tracking, HIPAA compliance infrastructure — lives in a Phase 2 backlog, ready to pull forward when the product proves its value.

The magic link auth is a good example of this thinking. It is not a login system — it is a lightweight bot gate that captures a verified email address. Clerk handles the heavy lifting. We do not store passwords, manage sessions, or build account screens. For the 60-and-older demographic, "check your email and click the link" is far simpler than "create an account with a password."

### What Comes Next

Sprint 2 runs March 26 through April 2, and it builds the core flow — the pipeline from form submission to prediction chart. Here is what that includes:

**Clerk auth integration.** The magic link flow goes from prototype stub to real authentication. The webhook fires on sign-up, piping the email into our leads table automatically.

**Database on Railway.** One table — `leads` — storing name, email, lab values, and a timestamp. That is your campaign data. We will set up CSV export so you can pull leads manually while we validate the funnel before wiring up any email automation.

**The FastAPI prediction endpoint.** This is where your algorithm lives. `/predict` takes BUN, creatinine, and age, runs your rules engine, and returns all four trajectory lines. LKID-14 is the card, and your spec is the source of truth.

**The real chart.** Harshit will replace the placeholder with an interactive Visx chart showing all four trajectories with distinct colors, dash patterns, and labels. Tooltips, crosshairs, hover states — the full interactive experience your patients will see.

**End-to-end pipeline.** Form submits to the API. API returns trajectories. Chart renders them. The full loop, working.

Sprint 3 (April 2-9) adds the PDF export, polish, disclaimers, and the final QA gate. Ship date is April 9.

We are on track. The prototype is live, the specs are solid, and your calc spec gives us exactly what we need to build the engine. If you have a few minutes this week to click through the prototype and react, that feedback will shape Sprint 2 priorities.

Looking forward to building this with you.

— Husser, Product Manager
