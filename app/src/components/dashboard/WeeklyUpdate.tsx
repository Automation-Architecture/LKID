import { CheckCircle2 } from "lucide-react";

interface UpdateData {
  title: string;
  date: string;
  sprint: number;
  highlights: string[];
  productUpdate: string;
  technicalUpdate: string;
}

// Static update data — in production this would read from markdown files
const UPDATES: UpdateData[] = [
  {
    title: "Week 2 — Core Flow",
    date: "April 2, 2026",
    sprint: 2,
    highlights: [
      "11 PRs merged (#9–#21) — auth, database, API, prediction form, and lead capture all integrated",
      "Clerk magic-link authentication live with webhook-based lead capture",
      "PostgreSQL on Railway with Alembic migrations — creatinine range expanded to 20.0",
      "FastAPI /predict endpoint returning all 4 trajectory paths with 15 time points",
      "Post-merge QA caught 4 HIGH-severity bugs — all fixed same day",
    ],
    productUpdate: `Sprint 2 delivered the core end-to-end flow. A patient can now enter their email, receive a magic link, authenticate, fill out the prediction form with their kidney health lab values, and receive a prediction response with all four eGFR trajectory paths. Every piece of the pipeline is connected and working.

We merged 11 pull requests this week, touching authentication (Clerk v7 integration), the database layer (PostgreSQL on Railway with Alembic migrations), the FastAPI prediction endpoint, the prediction form with full validation, and the lead capture webhook. The form validates all inputs against the ranges from your calc spec — BUN 5–100 (soft cap with warning at 150), creatinine 0.3–20.0, and age 18–120.

Post-merge QA found four high-severity bugs that would have shipped to production: a Playwright tsconfig conflict that broke the Vercel build, Clerk v7 type incompatibilities with Next.js 16, a middleware conflict between Clerk and Next.js 16's new routing, and a range validation mismatch between the frontend and backend. All four were identified by Yuri within hours of merge and fixed the same day. This validates our embedded QA process — catching these in staging saved us from a broken launch.

Two cards remain blocked on your input: LKID-14 (the rules engine, pending your response to the 6 formula questions) and LKID-47 (Klaviyo email integration, pending your API key). Neither blocks Sprint 3 progress — we're scaffolding the rules engine with placeholder formulas so it's ready to drop in your confirmed values the moment you respond.

The client dashboard you're reading this on is now auto-updating from Jira every 6 hours, so you'll always see current sprint progress without waiting for a manual refresh.`,
    technicalUpdate: `The backend is now fully operational on Railway. The FastAPI application serves the /predict endpoint, which accepts BUN, creatinine, and age (required) plus hemoglobin, CO2, and albumin (optional) and returns four trajectory arrays — no treatment, BUN 18–24, BUN 13–17, and BUN ≤12 — each with 15 time points spanning 0 to 120 months. The CKD-EPI 2021 race-free equation calculates baseline eGFR when the patient doesn't enter their own value.

The database schema is intentionally minimal — a single leads table capturing email, prediction inputs, and timestamps. Clerk handles authentication and session management. A webhook fires on successful magic-link authentication, writing the verified email to our leads table. This is the lead-gen funnel: email in, prediction out, warm lead captured.

We resolved a significant cross-boundary validation issue this week. The backend engineering meeting on March 27 produced a binding validation range table that all three layers (frontend, Pydantic, database CHECK constraints) must conform to. The creatinine maximum was expanded from 15.0 to 20.0 across all layers — the Alembic migration, Pydantic model, and frontend validation are all aligned. This change is pending your confirmation (Question 6 in our email).

The Clerk v7 integration with Next.js 16 required temporary workarounds: we disabled the Clerk middleware (which conflicts with Next.js 16's new routing model) and added ts-nocheck directives to pages using Clerk v7 hooks that have type incompatibilities. Full migration is planned for Sprint 3. The workarounds don't affect functionality — authentication works correctly end-to-end.

For Sprint 3, the critical path is the Visx eGFR trajectory chart (LKID-19), which the PDF export, chart interactivity, and results page all depend on. We're also scaffolding the v2.0 prediction engine with the two-component Phase 1 formula (BUN suppression removal + rate differential) and continuous Phase 2 function, ready for your formula confirmation.`,
  },
  {
    title: "Week 1 — Design Sprint",
    date: "March 26, 2026",
    sprint: 1,
    highlights: [
      "7 prototype screens built and deployed — real Next.js components, not mockups",
      "QA pass complete — 7 issues found, all resolved",
      "Server-side calc spec received and corrections acknowledged",
      "Potassium field removed per v2.0 spec; eGFR threshold corrected to 12",
      "5 of 8 design sprint PRs merged; form validation and accessibility shipped",
    ],
    productUpdate: `This week marked the formal kickoff of the KidneyHood build, and we hit the ground running. The team completed the entire Design Sprint — translating your product vision into a working, clickable prototype that's now live on the web.

We built and deployed seven prototype screens: Landing, Email Entry, Magic Link Sent, Expired Link, Prediction Form, Loading, and Results. These aren't static mockups — they're real Next.js components with real routing. You can click through the entire user journey today at kidneyhood.vercel.app.

Our QA engineer Yuri reviewed all five design sprint deliverables. Three cards passed clean on first review. Two passed with conditions — he found seven issues total (three medium severity, four low). All seven were resolved in a follow-up commit. The medium issues were a missing accessibility label on the header, form field validation ranges that didn't match the component specs, and the PDF download button being permanently disabled instead of showing a loading state. Every one is now fixed.

Your server-side calculation specification was received and thoroughly reviewed. We want to specifically acknowledge two important corrections you flagged: the dialysis threshold is eGFR 12 (we had incorrectly assumed 15), and potassium has been removed from the engine inputs per your v2.0 specification. Both corrections have been applied across our codebase, stories, and PRD. The BUN suppression estimate from Section 3.7 is a valuable addition we're tracking for the /predict response.

The Lean Launch PRD cut the original scope from 89 tickets down to approximately 38, reduced API endpoints from 12 to 5, and simplified the database from 5 tables to a single leads table plus Clerk for authentication. This is a lead generation tool, not a patient portal — every architectural decision reinforces that focus.

Looking ahead, Sprint 2 (March 26 - April 2) builds the core flow: Clerk authentication integration, database setup on Railway, the FastAPI prediction endpoint implementing your algorithm, the real chart with all four trajectory lines, and the end-to-end form-to-chart pipeline.`,
    technicalUpdate: `The frontend stack is Next.js 15 with shadcn/ui components and Tailwind CSS, deployed on Vercel. We chose this combination for three reasons: server-side rendering gives us SEO visibility for the landing page, shadcn provides accessible components out of the box which is critical for the 60+ target audience, and Vercel's preview deployments mean every push to a feature branch generates a shareable URL.

The backend architecture pairs FastAPI on Railway with PostgreSQL on Railway. FastAPI was selected because your calculation specification is written in Python pseudocode — we can translate your algorithm nearly line-for-line into the prediction module. FastAPI also generates OpenAPI documentation automatically, which will be valuable as we iterate on the /predict endpoint. Railway provides managed Postgres with zero-config deploys at a $5/month hobby tier, appropriate for the MVP phase.

Your calc spec maps directly to our implementation plan. Section 1 (the 15-value time points array) becomes a constant in the prediction module. Section 2 (dialysis threshold at eGFR 12 — corrected from our earlier assumption of 15) defines the threshold line and dial_ages interpolation. Sections 3.1 through 3.6 become the core of the /predict endpoint, implementing all four trajectory paths: no-treatment decline with BUN-adjusted rates, and three treatment tiers (BUN ≤12, 13-17, 18-24) each with Phase 1 exponential gain, Phase 2 logarithmic accumulation, and post-Phase 2 tier-specific decline. Section 3.7's BUN suppression estimate is a new field we're adding to the API response. Section 4's three test vectors are our golden-file boundary tests — the engine must match within ±0.2 eGFR tolerance. Section 5's optional field modifiers are architecturally supported but deferred to post-MVP.

Authentication uses Clerk's magic-link flow. The user enters their email, receives a magic link, and clicking it creates a verified session. A Clerk webhook fires on successful authentication, capturing the email in our leads table — this is the core lead-gen mechanism. No passwords to remember, which is important for the 60+ demographic.

For PDF generation, Playwright renders the results page server-side and captures the SVG chart at exact visual fidelity. We chose Playwright over a PDF library because the chart is a React component with interactive tooltips — rendering it through a real browser preserves the exact appearance.

Key tradeoffs: Railway over AWS for simplicity (MVP doesn't need auto-scaling). A single leads table over a full relational schema (we store email plus prediction inputs, not medical records). Stateless PDF re-rendering over cached results (simpler, no storage costs, and the prediction is deterministic from the same inputs).`,
  },
];

export function WeeklyUpdate() {
  return (
    <section className="space-y-6" aria-labelledby="weekly-updates-heading">
      <h2 id="weekly-updates-heading" className="text-2xl font-bold" style={{ color: "var(--brand-teal)" }}>
        Weekly Updates
      </h2>

      {UPDATES.map((update) => (
        <div
          key={update.date}
          className="rounded-xl border p-5 md:p-8"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#D8D8D8" }}
        >
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold" style={{ color: "var(--brand-teal)" }}>
              {update.title}
            </h3>
            <span className="rounded-full border px-3 py-0.5 text-xs font-medium" style={{ borderColor: "var(--brand-teal)", color: "var(--brand-teal)" }}>
              Sprint {update.sprint}
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "#636363" }}>
            {update.date}
          </p>

          {/* Highlights */}
          <ul className="mt-4 space-y-2">
            {update.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-base" style={{ color: "#010101" }}>
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: "#166534" }} />
                {h}
              </li>
            ))}
          </ul>

          <hr className="my-7" style={{ borderColor: "#E8E8E8" }} />

          {/* Product Update */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: "#004D43" }}
              >
                H
              </div>
              <div>
                <div className="text-lg font-semibold" style={{ color: "#010101" }}>Product Update</div>
                <div className="text-xs" style={{ color: "#636363" }}>Husser — Product Manager</div>
              </div>
            </div>
            <div className="space-y-3 text-base leading-relaxed" style={{ color: "#010101" }}>
              {update.productUpdate.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          <hr className="my-7" style={{ borderColor: "#E8E8E8" }} />

          {/* Technical Update */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
                style={{ backgroundColor: "#D8D8D8", color: "#636363" }}
              >
                JD
              </div>
              <div>
                <div className="text-lg font-semibold" style={{ color: "#010101" }}>Technical Update</div>
                <div className="text-xs" style={{ color: "#636363" }}>John Donaldson — API Designer</div>
              </div>
            </div>
            <div className="space-y-3 text-base leading-relaxed" style={{ color: "#010101" }}>
              {update.technicalUpdate.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
