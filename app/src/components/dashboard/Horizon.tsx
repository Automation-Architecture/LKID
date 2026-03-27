const UPCOMING = [
  {
    name: "Sprint 2 — Core Flow",
    dates: "Apr 6 – Apr 10",
    status: "up_next" as const,
    deliverables: [
      "Clerk magic-link authentication",
      "PostgreSQL database on Railway",
      "FastAPI prediction endpoint (your algorithm)",
      "Real 4-trajectory eGFR chart",
      "Form-to-chart end-to-end pipeline",
      "Lead capture webhook",
    ],
  },
  {
    name: "Sprint 3 — Polish & QA",
    dates: "Apr 13 – Apr 17",
    status: "planned" as const,
    deliverables: [
      "PDF export via Playwright (exact chart fidelity)",
      "Medical disclaimers and legal copy",
      "Chart interactivity (tooltips, crosshairs)",
      "End-to-end test suite",
      "Final accessibility audit + axe-core",
      "Yuri's QA gate — final sign-off",
    ],
  },
];

export function Horizon() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: "#004D43" }}>
        What&#39;s Coming
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
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
                  backgroundColor: sprint.status === "up_next" ? "#FEF3C7" : "#F3F4F6",
                  color: sprint.status === "up_next" ? "#92400E" : "#6B7280",
                }}
              >
                {sprint.status === "up_next" ? "Up Next" : "Planned"}
              </span>
            </div>
            <p className="mt-1 text-sm" style={{ color: "#636363" }}>
              {sprint.dates}
            </p>
            <ul className="mt-4 space-y-2">
              {sprint.deliverables.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#010101" }}>
                  <span style={{ color: "#636363" }}>&bull;</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Ship date */}
      <div
        className="relative flex items-center gap-4 rounded-xl px-8 py-6"
        style={{ backgroundColor: "#004D43" }}
      >
        <div style={{ width: "4px", height: "32px", backgroundColor: "#E6FF2B", borderRadius: "2px", flexShrink: 0 }} />
        <div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
            Target Launch
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            April 17, 2026
          </p>
        </div>
      </div>
    </section>
  );
}
