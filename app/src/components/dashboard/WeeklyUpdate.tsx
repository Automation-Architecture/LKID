import { CheckCircle2 } from "lucide-react";

interface UpdateData {
  title: string;
  date: string;
  sprint: number;
  highlights: string[];
  productUpdate: string;
  technicalUpdate: string;
}

// Static Week 1 data — in production this would read from markdown files
const UPDATES: UpdateData[] = [
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
