const SPRINTS = [
  { name: "Sprint 1 — Design", start: "2026-03-30", end: "2026-04-03" },
  { name: "Sprint 2 — Core Flow", start: "2026-04-06", end: "2026-04-10" },
  { name: "Sprint 3 — Polish & QA", start: "2026-04-13", end: "2026-04-17" },
];

const PROJECT_START = new Date("2026-03-30");
const PROJECT_END = new Date("2026-04-17");
const TOTAL_DAYS = (PROJECT_END.getTime() - PROJECT_START.getTime()) / (1000 * 60 * 60 * 24);

function getProgress(): number {
  const now = new Date();
  if (now < PROJECT_START) return 0;
  if (now > PROJECT_END) return 100;
  const elapsed = (now.getTime() - PROJECT_START.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round((elapsed / TOTAL_DAYS) * 100);
}

function getSprintPosition(start: string): number {
  const d = new Date(start);
  const elapsed = (d.getTime() - PROJECT_START.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round((elapsed / TOTAL_DAYS) * 100);
}

export function HeroBanner() {
  const progress = getProgress();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl" style={{ color: "#004D43" }}>
          KidneyHood
        </h1>
        <p className="mt-1 text-base" style={{ color: "#636363" }}>
          Project Dashboard
        </p>
      </div>

      {/* Timeline bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm" style={{ color: "#636363" }}>
          <span>Mar 30</span>
          <span>Apr 17</span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#D8D8D8" }}>
          {/* Sprint segments */}
          {SPRINTS.map((sprint, i) => {
            const left = getSprintPosition(sprint.start);
            const end = getSprintPosition(sprint.end);
            const width = end - left;
            const colors = ["#004D43", "#2563eb", "#7c3aed"];
            return (
              <div
                key={sprint.name}
                className="absolute top-0 h-full"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: colors[i],
                  opacity: 0.3,
                }}
              />
            );
          })}
          {/* Progress fill */}
          <div
            className="absolute top-0 h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: "#004D43" }}
          />
          {/* You are here marker */}
          <div
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
            style={{ left: `${progress}%`, backgroundColor: "#E6FF2B" }}
          />
        </div>

        {/* Sprint labels */}
        <div className="flex flex-col gap-2 pt-2 md:flex-row md:justify-between">
          {SPRINTS.map((sprint) => (
            <div key={sprint.name} className="text-sm" style={{ color: "#636363" }}>
              <span className="font-medium" style={{ color: "#010101" }}>{sprint.name}</span>
              <br />
              <span>{sprint.start.slice(5)} – {sprint.end.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
