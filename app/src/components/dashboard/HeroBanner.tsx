"use client";

const SPRINTS = [
  { name: "Sprint 1 — Design", start: "2026-03-20", end: "2026-03-26" },
  { name: "Sprint 2 — Core Flow", start: "2026-03-26", end: "2026-04-02" },
  { name: "Sprint 3 — Polish & QA", start: "2026-04-02", end: "2026-04-09" },
];

const PROJECT_START = new Date("2026-03-20");
const PROJECT_END = new Date("2026-04-09");
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
    <section className="space-y-6" aria-labelledby="project-timeline-heading" style={{ paddingTop: "48px", paddingBottom: "32px" }}>
      <div className="flex items-center gap-3">
        <h1 id="project-timeline-heading" className="text-2xl font-bold" style={{ color: "var(--brand-teal)" }}>KidneyHood</h1>
        <span className="text-sm font-medium" style={{ color: "var(--brand-body)" }}>Project Dashboard</span>
      </div>

      {/* Timeline bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm" style={{ color: "var(--brand-body)" }}>
          <span>Mar 20</span>
          <span>Apr 9</span>
        </div>
        <div
          className="relative h-3 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--brand-track)" }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Project timeline progress"
        >
          {/* Sprint segments — teal only, opacity varies by status */}
          {SPRINTS.map((sprint) => {
            const left = getSprintPosition(sprint.start);
            const end = getSprintPosition(sprint.end);
            const width = end - left;
            const sprintEnd = new Date(sprint.end);
            const now = new Date();
            const isCompleted = now > sprintEnd;
            const isCurrent = now >= new Date(sprint.start) && now <= sprintEnd;
            if (!isCompleted && !isCurrent) return null;
            return (
              <div
                key={sprint.name}
                className="absolute top-0 h-full"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: "var(--brand-teal)",
                  opacity: isCompleted ? 1 : 0.4,
                }}
              />
            );
          })}
          {/* You are here marker */}
          <div
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
            style={{ left: `${progress}%`, backgroundColor: "var(--brand-lime)" }}
          />
        </div>

        {/* Sprint labels */}
        <div className="flex flex-col gap-2 pt-2 md:flex-row md:justify-between">
          {SPRINTS.map((sprint) => (
            <div key={sprint.name} className="text-sm" style={{ color: "var(--brand-body)" }}>
              <span className="font-medium" style={{ color: "var(--brand-black)" }}>{sprint.name}</span>
              <br />
              <span>{sprint.start.slice(5)} – {sprint.end.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
