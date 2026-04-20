type SprintStatus = "done" | "in_progress" | "planned";

const UPCOMING: Array<{
  name: string;
  dates: string;
  status: SprintStatus;
  deliverables: string[];
}> = [
  {
    name: "Sprint 3 — Polish & QA",
    dates: "Mar 30 – Apr 9",
    status: "done",
    deliverables: [
      "Visx eGFR trajectory chart (4 lines, responsive)",
      "PDF export via Playwright (pixel-perfect chart fidelity)",
      "Medical disclaimers and legal copy",
      "Rules engine v2.0 — matched against your golden vectors",
      "Rate limiting on API endpoints",
      "Boundary tests + golden files + E2E suite + axe-core audit",
      "Pre-release QA gate signed off",
    ],
  },
  {
    name: "Sprint 4 — No-Auth Tokenized Flow",
    dates: "Apr 19 – Apr 20",
    status: "done",
    deliverables: [
      "New patient funnel: /labs → /gate → /results (no account required)",
      "Report token delivery — each report has a signed shareable link",
      "Resend transactional email with PDF report attached",
      "Klaviyo warm-campaign event wired (eGFR, BUN tier, report link)",
      "WCAG 2 AA accessibility across the chart and stat cards",
      "Three deploy guardrails added so we can't ship blind again",
      "Legacy Clerk-gated pages removed — clean codebase",
    ],
  },
  {
    name: "Sprint 5 — Launch Readiness",
    dates: "Apr 20 – (in progress)",
    status: "in_progress",
    deliverables: [
      "Shipped — Error monitoring (Sentry) on backend + frontend",
      "Shipped — Conversion analytics (PostHog funnel: labs / gate / results / PDF)",
      "Shipped — Results page visual parity with finalized design",
      "Shipped — Chart redesign to match design brand identity",
      "In progress — Dashboard v2 for you (launch-metrics panels)",
      "Up next — SEO basics (OG tags, sitemap, structured data)",
      "Up next — Security headers (CSP, HSTS, X-Frame-Options)",
    ],
  },
];

export function Horizon() {
  return (
    <section className="space-y-6" aria-labelledby="whats-coming-heading">
      <h2 id="whats-coming-heading" className="text-2xl font-bold" style={{ color: "var(--brand-teal)" }}>
        What&#39;s Coming
      </h2>

      <div className="grid gap-4 md:grid-cols-3">
        {UPCOMING.map((sprint) => (
          <div
            key={sprint.name}
            className="rounded-xl border p-6"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#D8D8D8" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: "#010101" }}>
                {sprint.name}
              </h3>
              <span
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: sprint.status === "done" ? "#DCFCE7" : sprint.status === "planned" ? "#F3F4F6" : "#FEF3C7",
                  color: sprint.status === "done" ? "#166534" : sprint.status === "planned" ? "#6B7280" : "#92400E",
                }}
              >
                {sprint.status === "done" ? "Complete" : sprint.status === "planned" ? "Planned" : "In Progress"}
              </span>
            </div>
            <p className="mt-1 text-sm" style={{ color: "#636363" }}>
              {sprint.dates}
            </p>
            <ul className="mt-4 space-y-2">
              {sprint.deliverables.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#010101" }}>
                  <span aria-hidden="true" style={{ color: "var(--brand-body)" }}>&bull;</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Launch status */}
      <div
        className="relative flex items-center gap-4 rounded-xl px-8 py-6"
        style={{ backgroundColor: "#004D43" }}
      >
        <div style={{ width: "4px", height: "32px", backgroundColor: "#E6FF2B", borderRadius: "2px", flexShrink: 0 }} />
        <div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
            Application live — Sprint 5 in progress
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            April 20, 2026
          </p>
          <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
            Five Sprint 5 cards already shipped: error monitoring, analytics funnel, Results redesign, component refactor, and the chart update. Dashboard v2, SEO, and security headers up next.
          </p>
        </div>
      </div>
    </section>
  );
}
