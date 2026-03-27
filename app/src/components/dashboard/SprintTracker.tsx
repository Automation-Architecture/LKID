import sprintData from "@/app/client/data/sprint-progress.json";

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  done: { bg: "#DCFCE7", text: "#166534", border: "#BBF7D0" },
  in_progress: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  upcoming: { bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" },
  blocked: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
};

const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  in_progress: "In Progress",
  upcoming: "Upcoming",
  blocked: "Blocked",
};

export function SprintTracker() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: "#004D43" }}>
        Sprint Progress
      </h2>

      {sprintData.sprints.map((sprint) => {
        const doneCount = sprint.cards.filter((c) => c.status === "done").length;
        return (
          <div key={sprint.name} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold" style={{ color: "#010101" }}>
                {sprint.name}
              </h3>
              <span className="text-sm" style={{ color: "#636363" }}>
                {doneCount} of {sprint.cards.length} complete
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {sprint.cards.map((card) => {
                const style = STATUS_STYLES[card.status] ?? STATUS_STYLES.upcoming;
                return (
                  <div
                    key={card.id}
                    className="border p-3 md:p-4"
                    style={{
                      borderRadius: "10px",
                      backgroundColor: style.bg,
                      borderColor: style.border,
                    }}
                  >
                    <div className="text-xs font-medium" style={{ color: style.text }}>
                      {card.id}
                    </div>
                    <div
                      className="mt-1 line-clamp-2 text-sm"
                      style={{ color: "#010101" }}
                    >
                      {card.title}
                    </div>
                    <div className="mt-2 text-xs font-medium" style={{ color: style.text }}>
                      {STATUS_LABELS[card.status]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
