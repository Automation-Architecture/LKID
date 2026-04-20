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
    title: "Week 4 — No-Auth Tokenized Flow",
    date: "April 20, 2026",
    sprint: 4,
    highlights: [
      "New patient funnel shipped: /labs → /gate → /results (no patient account required — the report token is the credential)",
      "Transactional email with PDF attached is live — patients receive their report immediately via Resend",
      "Klaviyo warm-campaign event wired — every captured lead fires Prediction Completed with eGFR, BUN tier, and report link",
      "WCAG 2 AA accessibility on the chart and stat cards — Harshit + Inga color pass",
      "Three deploy guardrails added (auto-migrate, post-deploy smoke, 6-hour heartbeat) — no more silent regressions",
      "Legacy Clerk-gated pages retired — cleaner codebase for the next sprint",
    ],
    productUpdate: `Sprint 4 shipped the new no-auth patient funnel in a single day — 13 days ahead of the original two-week plan. Patients now land on the marketing page, click "Start your check," fill in lab values on /labs, enter name + email at the gate, and view their personalized trajectory chart on /results/{token}. The report token is the credential — shareable by link, no account required.

Every patient who completes the gate now gets two things automatically: a transactional email from Resend with the full PDF report attached (they can open it in their inbox without returning to the site), and a Klaviyo event ("Prediction Completed") that upserts their profile with eGFR, BUN tier, confidence tier, and the report URL. That Klaviyo event is what the warm-campaign Flow will trigger off — once the Flow is configured in the Klaviyo dashboard (next on your list), the nurture cadence runs automatically.

The chart itself got an accessibility pass this sprint. Stat-card text was re-tokened to meet WCAG 2 AA contrast (4.5:1 on white), and Inga re-picked the four trajectory colors — BUN ≤12 uses emerald green (5.5:1), BUN 13–17 uses sky blue (5.9:1), BUN 18–24 uses amber (5:1), and No Treatment uses dark slate (10.3:1). She chose slate rather than red for No Treatment specifically to avoid a clash with the dialysis-threshold marker, which is already red. We'd value your review of the palette from a clinical standpoint — happy to revisit if any of the colors signal the wrong thing.

One incident worth surfacing: during the Sprint 4 deploy we discovered that the production database was completely empty — none of our schema migrations from Sprint 2 or Sprint 3 had actually run in production. We caught it, applied the migrations live, and added three guardrails so it can't happen again (auto-migrate on every deploy, a post-deploy smoke test that runs the full user flow, and a 6-hour heartbeat that catches silent regressions between deploys). Because your app was pre-launch with near-zero real traffic, no patient data was affected — the incident was purely internal. A short postmortem is drafted and available if you'd like to read it.

The app is now functionally launch-ready. Remaining operational tasks before you go public: finish DNS verification for kidneyhood.org (records were generated and are ready to paste into your registrar), configure the Klaviyo Flow in the Klaviyo dashboard (profile schema + warm-campaign cadence), and decide on launch timing.`,
    technicalUpdate: `Sprint 4 merged 18 PRs in ~24 hours. Seven engineering cards (LKID-61 through LKID-67, plus LKID-70) plus three incident-driven infrastructure PRs and four close-out chores.

Backend (LKID-61, LKID-62, LKID-64, LKID-70): Added a predictions table keyed by a 32-byte URL-safe report_token (no JWT, no HMAC — plain opaque credential with 256 bits of entropy). Rewired POST /predict to return the token alongside the prediction payload. Added GET /results/[token] (404/410 semantics, captured flag), POST /leads (upserts lead, links prediction, fires Resend + Klaviyo in parallel), and GET /reports/[token]/pdf. The Resend transactional send runs fire-and-forget from /leads so the user never waits on email; Klaviyo is independently fire-and-forget so a Resend failure doesn't block the warm campaign. Alembic migration 004 creates the table with all three indexes; regenerated db_schema.sql snapshot (LKID-70) so the human-readable schema matches migrations.

Frontend (LKID-63, LKID-66, LKID-67): Four new pages — /labs (labs form with client-side validation), /gate/[token] (email capture with blurred preview), /results/[token] (full chart + stat cards + PDF download link), /internal/chart/[token] (server-rendered target for the Playwright PDF engine, secret-gated). ClerkProvider moved from the root layout into /client/[slug]/layout.tsx — Clerk now scopes only to your dashboard, not the patient funnel. Landing page CTAs repointed from /auth → /labs. Legacy /predict, /auth, and /results pages deleted after 24-hour prod smoke. Chart accessibility pass across HTML text (Harshit) and SVG colors (Inga).

QA (LKID-65): Playwright E2E suite rewritten for the two-step flow (labs → gate → results with MSW mocks). Axe-core suite updated for /labs, /gate/[token], /results/[token]. 6/6 E2E + 5/5 a11y passing locally and in CI.

Guardrails (LKID-68): Three preventive measures added after the empty-DB incident. G1 — preDeployCommand in railway.toml now runs alembic upgrade head on every deploy; psycopg2-binary added because Alembic's env is sync while the app uses asyncpg. G2 — GitHub Actions workflow runs a real curl-based prod smoke (predict → results → leads → PDF) on every push to main. G3 — same workflow on a 6-hour cron to catch silent regressions between deploys (env drift, container restart, DNS issues, expired keys). First scheduled G3 run verified green at 07:53 UTC today.

Secrets + ops: Resend and Klaviyo API keys wired to Railway. Live end-to-end smoke delivered a real PDF-attached email to Brad's inbox from reports@automationarchitecture.ai (stopgap — flips to reports@kidneyhood.org once the DNS records provisioned today verify). Klaviyo "Prediction Completed" event fires with the full attribute payload including bun_tier for Flow segmentation.

Four incidents caught and resolved same-day: empty prod DB (root cause: no deploy-time migration hook, fixed via G1), landing CTAs 404 (Clerk proxy missed the new routes, hotfixed in PR #42), PDF endpoint 504 (Vercel env var split — NEXT_PUBLIC_PDF_SECRET set but not PDF_SECRET, fixed by copying to a new env var and redeploying), chart a11y contrast (pre-existing Sprint 3 issue surfaced by the new test scope, fixed across three PRs). Full retrospective at agents/husser/drafts/sprint4-retrospective.md.`,
  },
  {
    title: "Week 3 — PDF, Polish & Ship",
    date: "April 8, 2026",
    sprint: 3,
    highlights: [
      "Prediction engine rewritten to match Lee's confirmed golden vectors — all 3 vectors pass within ±0.2 eGFR tolerance",
      "PDF export fully operational — Playwright renders pixel-perfect chart, downloads as PDF from results page",
      "6 E2E integration tests (happy path + error path) and axe-core accessibility audit on all 4 pages",
      "Clerk v7 auth migrated to Next.js 16 proxy convention — JWT verification re-enabled",
      "59 of 60 Jira cards Done — only Klaviyo email integration remains (API key now received)",
    ],
    productUpdate: `Sprint 3 is complete and the application is live. This was the final sprint before ship — focused on PDF export, polish, testing, and the QA gate. We merged 5 pull requests today (#28–#32) covering the prediction engine rewrite, PDF generation, E2E tests, accessibility audit, and Clerk auth migration.

The most critical delivery was the prediction engine rewrite (LKID-59). Lee sent three golden test vectors on April 2 that revealed the engine was overestimating treatment benefit by 4–8 eGFR points. The root cause: the engine used a two-component Phase 1 formula when Lee's actual model is simpler — a 0.31-coefficient formula with no Phase 2 gain. The engine was rewritten to match Lee's confirmed model. All three golden vectors now pass within ±0.2 tolerance (actual deltas: -0.01, 0.00, -0.01).

PDF export is now fully operational. When a patient clicks "Download Your Results (PDF)" on the results page, the backend re-runs the prediction engine, renders the chart via Playwright (headless Chromium), and returns a pixel-perfect PDF. The PDF includes the eGFR trajectory chart with all 4 treatment scenarios, stat cards, and the medical disclaimer. File size is approximately 104KB per PDF.

The pre-release QA gate passed with conditions: prediction engine tests (124/124 pass), E2E tests (6 tests covering form submission, error handling, and navigation), and the PDF endpoint all verified. Two items deferred as conditions: the axe-core accessibility audit (now implemented — zero critical/serious WCAG 2.1 AA violations) and the Clerk v7 migration (now complete — middleware migrated to Next.js 16 proxy convention).

End-to-end browser testing confirmed the full user flow works in production: form fill → API call → results page with interactive chart → PDF download. The chart renders 4 trajectory lines (BUN ≤12, BUN 13–17, BUN 18–24, No Treatment) with CKD stage bands, dialysis threshold, and stat cards showing 5-year and 10-year projected eGFR.

The only remaining card is LKID-47 (Klaviyo email integration). Lee's API key has been received and configured on Railway. Implementation is planned for next sprint — the Klaviyo flow (welcome email with personalized prediction results) needs the email template designed before we wire up the backend integration.`,
    technicalUpdate: `Sprint 3 delivered 5 PRs across the full stack. Here is the technical summary of each:

PR #28 (LKID-59) — Engine Formula Rewrite: Replaced the two-component Phase 1 formula (BUN suppression removal + rate differential) with Lee's confirmed 0.31-coefficient model: phase1_total = min(tier_cap, (BUN - target) × 0.31). Removed Phase 2 gain function entirely. Phase 1 saturates at month 3 (~91.8%), then linear decline at CKD-stage treatment rate with age attenuation (×0.80 for age > 70). Path 4 floor (-0.33/yr) preserved for BUN ≤12 tier. Added separate treatment decline rate table (Stage 4 = -2.0/yr confirmed by Lee; other stages estimated). 124 tests pass including 3 strict golden vector assertions.

PR #29 (LKID-4) — PDF Export: Implemented POST /predict/pdf endpoint using Playwright headless Chromium on Railway. Architecture: backend re-runs prediction engine → base64-encodes results → Playwright navigates to internal /internal/chart page → waits for SVG render → page.pdf() → returns StreamingResponse. Internal chart page renders EgfrChart at 960px fixed width with structural floor callout and disclaimer. Browser lifecycle managed in FastAPI lifespan (persistent Chromium instance with asyncio.Lock). Page wrapped in try/finally to prevent leaks on failure.

PR #30 (LKID-28) — E2E Tests: 6 Playwright integration tests covering happy path (form → predict → results with chart + PDF button) and error path (empty submission with validation errors, API 500 with form state preservation, 429 rate limit, direct /results access redirect). Uses route interception to mock /predict API responses. Separate playwright.e2e.config.ts.

PR #31 (LKID-26) — Accessibility Audit: axe-core scans on all 4 user-facing pages (home, predict, results, auth) for WCAG 2.1 AA violations. Zero critical/serious violations required. SVG chart internals excluded (Visx-generated; section has aria-label). Results page test navigates full form→results flow.

PR #32 (LKID-60) — Clerk v7 Migration: Renamed middleware.ts → proxy.ts per Next.js 16 convention. clerkMiddleware() now runs on all matched routes with public route exceptions for /, /auth, /client/*, /internal/*, /predict, /results. This re-enables JWT verification that was disabled since Sprint 2.

Infrastructure: Fixed Vercel deployment (peer dependency conflict with React 19 — added .npmrc with legacy-peer-deps). Fixed Railway deployment (root directory set to backend/, pydantic version unpinned for svix compatibility). Configured env vars on both platforms (CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, PDF_SECRET, FRONTEND_INTERNAL_URL, NEXT_PUBLIC_API_URL, KLAVIYO_API_KEY, CORS_ORIGINS, DATABASE_URL). Vercel Analytics added. Slack webhook configured for Vercel spend management alerts.`,
  },
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
