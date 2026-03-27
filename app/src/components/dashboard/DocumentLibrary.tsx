const DOCUMENTS = [
  {
    name: "Lean Launch MVP PRD",
    description: "Binding scope document — approved March 25, 2026. Corrected March 26.",
    type: "markdown" as const,
  },
  {
    name: "Server-Side Calc Spec v1.0",
    description: "Lee's calculation specification — received and acknowledged March 26.",
    type: "pdf" as const,
    isNew: true,
  },
  {
    name: "Design Sprint Outputs",
    description: "User flows, wireframes, and 21-component inventory from Sprint 1.",
    type: "markdown" as const,
  },
  {
    name: "QA Report — Design Sprint",
    description: "Yuri's review: 7 issues found (3 medium, 4 low), all resolved.",
    type: "markdown" as const,
  },
  {
    name: "Design Sign-Off",
    description: "Inga's 12-point review: 12/12 pass with 6 non-blocking exceptions.",
    type: "markdown" as const,
  },
];

export function DocumentLibrary() {
  return (
    <section className="space-y-4" aria-labelledby="documents-heading">
      <h2 id="documents-heading" className="text-2xl font-bold" style={{ color: "var(--brand-teal)" }}>
        Documents
      </h2>

      <div className="space-y-3">
        {DOCUMENTS.map((doc) => (
          <div
            key={doc.name}
            className="flex items-start gap-4 rounded-lg border px-5 py-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#D8D8D8" }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
              style={{
                backgroundColor: "#F3F4F6",
                color: "#636363",
              }}
            >
              {doc.type === "pdf" ? "PDF" : "MD"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "#010101" }}>
                  {doc.name}
                </span>
                {doc.isNew && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: "#E6FF2B", color: "#004D43" }}
                  >
                    New
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm" style={{ color: "#636363" }}>
                {doc.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
