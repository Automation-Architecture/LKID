import specData from "@/app/client/data/spec-tracker.json";

const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  in_progress: "In Progress",
  unblocked: "Unblocked",
  blocked: "Blocked",
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  done: { bg: "#DCFCE7", text: "#166534" },
  in_progress: { bg: "#FEF3C7", text: "#92400E" },
  unblocked: { bg: "#DBEAFE", text: "#1E40AF" },
  blocked: { bg: "#FEE2E2", text: "#991B1B" },
};

export function SpecTracker() {
  const addressed = specData.items.filter((i) => i.status === "done" || i.status === "in_progress").length;

  return (
    <section className="space-y-4" aria-labelledby="spec-acknowledgment-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="spec-acknowledgment-heading" className="text-2xl font-bold" style={{ color: "var(--brand-teal)" }}>
          Spec Acknowledgment
        </h2>
        <span className="text-sm" style={{ color: "#636363" }}>
          {addressed} of {specData.items.length} items addressed
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border" style={{ borderColor: "#D8D8D8" }}>
       <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#004D43" }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white" scope="col" style={{ width: "35%" }}>Spec Item</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white" scope="col" style={{ width: "15%" }}>Card</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white" scope="col" style={{ width: "15%" }}>Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white" scope="col" style={{ width: "35%" }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {specData.items.map((item, i) => {
              const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.unblocked;
              return (
                <tr
                  key={i}
                  className="border-b"
                  style={{
                    borderColor: "#E8E8E8",
                    backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#FAFAF8",
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "#010101" }}>
                    {item.spec_section}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#636363" }}>
                    {item.jira_card}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block rounded-full px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#636363" }}>
                    {item.notes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
       </div>
      </div>
    </section>
  );
}
