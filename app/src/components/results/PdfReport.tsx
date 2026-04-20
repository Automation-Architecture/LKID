"use client";

/**
 * LKID-82 — PDF Report component (design parity to project/PDF Report.html).
 *
 * This is the Playwright render target for the `/internal/chart/[token]` route.
 * It renders a static PDF-styled surface: navy header, title row (patient name
 * + report date), chart card + legend, scenario overview (pills + tinted
 * cards), explanation block with kidney visual, and a minimal disclaimer +
 * brand footer.
 *
 * Distinct surface from `ResultsView` (web):
 *   - PDF has no interactive pills / download affordances
 *   - Header is a single navy bar with centered brand (no links)
 *   - Explanation block omits the Download pill
 *   - Footer is just disclaimer + "KidneyHood.org" (no nav)
 *   - Scenario legend uses heart icons inline with chart (mirrors design source)
 *
 * The outer wrapper keeps `id="pdf-ready"` — Playwright waits for that
 * selector before calling `page.pdf()` (see backend/main.py::_render_pdf_for_token).
 *
 * Shared pieces reused from the web surface:
 *   - EgfrChart with `chrome={false}` → LKID-80 design chrome
 *   - Scenario tone tokens: `--s-{green,blue,yellow,gray}-{bg,border,text}`
 *   - Kidney visual SVG (radial gradient) from ResultsView
 *
 * CSS is scoped under `.kh-pdf` via dangerouslySetInnerHTML to prevent any
 * leak into the internal layout. The internal layout is bare, so fonts
 * (Manrope + Nunito Sans) must be declared here — the root layout's fonts
 * are not in the `/internal/*` tree.
 */

import { Manrope, Nunito_Sans } from "next/font/google";
import { useMemo } from "react";
import { EgfrChart } from "@/components/chart/EgfrChart";
import {
  transformPredictResponse,
  type ChartData,
  type PredictResponse,
  type StructuralFloor,
  type TrajectoryData,
} from "@/components/chart";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
});

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

export interface PdfReportProps {
  /** Raw backend prediction payload — transformed client-side for EgfrChart. */
  result: PredictResponse;
  /** Patient display name from leads table. Empty string if not captured. */
  patientName: string;
  /** ISO timestamp from predictions.created_at — formatted as report date. */
  createdAt: string;
  /** BUN user submitted on /labs — null if legacy row. Gates floor copy. */
  bun: number | null;
}

/* -------------------------------------------------------------------------- */
/*  Scenario metadata — parallels ResultsView.tsx SCENARIO_META                */
/* -------------------------------------------------------------------------- */

type ScenarioTone = "green" | "blue" | "yellow" | "gray";

interface ScenarioMeta {
  id: TrajectoryData["id"];
  label: string;
  tone: ScenarioTone;
  legend: string;
}

const SCENARIO_META: ScenarioMeta[] = [
  { id: "bun_lte_12", label: "BUN ≤ 12", tone: "green", legend: "Healthy range" },
  { id: "bun_13_17", label: "BUN 13-17", tone: "blue", legend: "Stable range" },
  { id: "bun_18_24", label: "BUN 18-24", tone: "yellow", legend: "Higher risk" },
  { id: "no_treatment", label: "No Treatment", tone: "gray", legend: "No treatment" },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function valueAtMonth(
  trajectory: TrajectoryData,
  targetMonths: number,
): number | null {
  const match = trajectory.points.find(
    (p) => Math.abs(p.monthsFromBaseline - targetMonths) < 0.5,
  );
  return match ? match.egfr : null;
}

function formatEgfr(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return String(Math.max(0, Math.round(value)));
}

function formatDialysisFooter(dialysisAge: number | null): string {
  if (dialysisAge === null || !Number.isFinite(dialysisAge)) {
    return "Not projected";
  }
  return `~age ${Math.round(dialysisAge)} yr`;
}

/**
 * Format ISO timestamp as "Month DD, YYYY" for the report date line.
 * Returns empty string on invalid input — the date line then hides itself.
 */
function formatReportDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function Heart({ fill }: { fill: string }) {
  return (
    <svg className="heart" viewBox="0 0 24 24" fill={fill} aria-hidden="true">
      <path d="M12 21s-7-4.5-9.5-9.2C.8 8.3 2.9 4.4 6.7 4.4c2 0 3.5 1 4.3 2.3.8-1.3 2.3-2.3 4.3-2.3 3.8 0 5.9 3.9 4.2 7.4C19 16.5 12 21 12 21z" />
    </svg>
  );
}

function KidneyVisual() {
  return (
    <div className="kidney-visual" aria-hidden="true">
      <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="kh-pdf-kidney-grad" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#9ED6F5" />
            <stop offset="50%" stopColor="#3A90C6" />
            <stop offset="100%" stopColor="#1E5C8A" />
          </radialGradient>
        </defs>
        <path
          fill="url(#kh-pdf-kidney-grad)"
          d="M56 20c-22 0-40 24-40 54s16 62 36 74c14 8 30 2 34-16 2-14-4-22-8-32-6-16 4-22 14-32 12-12 14-26 6-36-8-10-20-12-42-12zM108 20c22 0 40 24 40 54s-16 62-36 74c-14 8-30 2-34-16-2-14 4-22 8-32 6-16-4-22-14-32-12-12-14-26-6-36 8-10 20-12 42-12z"
        />
        <g fill="#fff" opacity={0.45}>
          <ellipse cx="40" cy="56" rx="8" ry="16" transform="rotate(-18 40 56)" />
          <ellipse cx="120" cy="56" rx="8" ry="16" transform="rotate(18 120 56)" />
        </g>
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scoped CSS — mirrors project/PDF Report.html with .kh-pdf namespace.      */
/* -------------------------------------------------------------------------- */

const PDF_CSS = `
.kh-pdf {
  --navy: var(--kh-navy);
  --ink: var(--kh-ink);
  --ink-2: var(--kh-ink-2);
  --body: var(--kh-body);
  --muted: var(--kh-muted);
  --bg: var(--kh-bg);
  --border: var(--kh-border);

  font-family: var(--font-nunito), 'Nunito Sans', system-ui, sans-serif;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.55;
  background: #fff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.kh-pdf *, .kh-pdf *::before, .kh-pdf *::after { box-sizing: border-box; }

/* Outer page shell — caps content width for the Letter print target.
 * Width is loose (not 560px like the HTML preview) because the Playwright
 * viewport is 1060px and print CSS handles page fit via @page margins in
 * main.py. 760px keeps the chart + 4-column scenario grid legible. */
.kh-pdf .page {
  max-width: 760px;
  margin: 0 auto;
  background: #fff;
}

/* ---------- Header ---------- */
.kh-pdf .hdr {
  background: var(--navy);
  color: #fff;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.01em;
}

/* ---------- Body padding ---------- */
.kh-pdf .body-pad { padding: 28px 32px 24px; }

/* ---------- Title row ---------- */
.kh-pdf .meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.kh-pdf .meta h1 {
  margin: 0 0 4px;
  color: var(--navy);
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.01em;
  line-height: 1.15;
}
.kh-pdf .meta .who { color: var(--ink-2); font-size: 14px; font-weight: 500; }
.kh-pdf .meta .date { color: var(--muted); font-size: 12px; padding-top: 6px; white-space: nowrap; }

/* ---------- Section titles ---------- */
.kh-pdf .sec-title {
  color: var(--navy);
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 22px 0 12px;
}
.kh-pdf .sec-title::before {
  content: "";
  width: 9px;
  height: 9px;
  background: var(--navy);
  border-radius: 999px;
}

/* ---------- Chart card ---------- */
.kh-pdf .chart-card {
  background: var(--bg);
  border-radius: 12px;
  padding: 16px 18px 14px;
}

.kh-pdf .legend {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.kh-pdf .legend .it {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-2);
}
.kh-pdf .legend .heart {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* ---------- Scenario pills ---------- */
.kh-pdf .sc-pills {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}
.kh-pdf .sc-pill {
  text-align: center;
  border-radius: 999px;
  padding: 8px 0;
  font-weight: 700;
  font-size: 12px;
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  border: 1px solid transparent;
}
.kh-pdf .sc-pill.green  { background: var(--s-green-bg);  color: var(--s-green-text);  border-color: var(--s-green-border); }
.kh-pdf .sc-pill.blue   { background: var(--s-blue-bg);   color: var(--s-blue-text);   border-color: var(--s-blue-border); }
.kh-pdf .sc-pill.yellow { background: var(--s-yellow-bg); color: var(--s-yellow-text); border-color: var(--s-yellow-border); }
.kh-pdf .sc-pill.gray   { background: var(--s-gray-bg);   color: var(--s-gray-text);   border-color: var(--s-gray-border); }

/* ---------- Scenario cards ---------- */
.kh-pdf .sc-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.kh-pdf .sc-card {
  border-radius: 12px;
  padding: 12px 14px 14px;
  border: 1px solid transparent;
}
.kh-pdf .sc-card.green  { background: var(--s-green-bg);  border-color: var(--s-green-border); }
.kh-pdf .sc-card.blue   { background: #F4F5FA;            border-color: var(--s-blue-border); }
.kh-pdf .sc-card.yellow { background: var(--s-yellow-bg); border-color: var(--s-yellow-border); }
.kh-pdf .sc-card.gray   { background: #F4F5F7;            border-color: var(--s-gray-border); }

.kh-pdf .sc-card .row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
.kh-pdf .sc-card .cell .lbl {
  font-size: 10.5px;
  color: var(--muted);
  font-weight: 600;
  margin-bottom: 3px;
}
.kh-pdf .sc-card .cell .val {
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.01em;
}
.kh-pdf .sc-card.green .val  { color: var(--s-green-text); }
.kh-pdf .sc-card.blue .val   { color: var(--s-blue-text); }
.kh-pdf .sc-card.yellow .val { color: var(--s-yellow-text); }
.kh-pdf .sc-card.gray .val   { color: var(--s-gray-text); }
.kh-pdf .sc-card .foot {
  font-size: 11px;
  color: var(--muted);
  font-weight: 500;
  line-height: 1.35;
}

/* ---------- Explanation block ---------- */
.kh-pdf .explain-grid {
  display: grid;
  grid-template-columns: 170px 1fr;
  gap: 20px;
  align-items: center;
  margin-top: 24px;
}
.kh-pdf .kidney-visual {
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  background: radial-gradient(circle at 50% 50%, #fff 55%, transparent 70%);
  position: relative;
  max-width: 170px;
}
.kh-pdf .kidney-visual::before,
.kh-pdf .kidney-visual::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(31, 37, 119, 0.08);
}
.kh-pdf .kidney-visual::before { inset: 6%; }
.kh-pdf .kidney-visual::after  { inset: 14%; }
.kh-pdf .kidney-visual svg {
  position: absolute;
  inset: 18%;
  width: 64%;
  height: 64%;
  filter: drop-shadow(0 8px 18px rgba(31, 122, 180, 0.3));
}
.kh-pdf .explain .sec-title { margin-top: 0; }
.kh-pdf .explain p {
  color: var(--body);
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.6;
}
.kh-pdf .explain strong { color: var(--ink); font-weight: 700; }

/* ---------- Disclaimer + brand footer ---------- */
.kh-pdf .fine-line {
  border-top: 1px solid var(--border);
  margin-top: 24px;
  padding-top: 14px;
  text-align: center;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}
.kh-pdf .foot-brand {
  text-align: center;
  margin-top: 12px;
  color: var(--navy);
  font-weight: 700;
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 16px;
}

/* ---------- Print ---------- */
@media print {
  .kh-pdf { background: #fff; }
  .kh-pdf .page { max-width: none; margin: 0; }
  @page { size: Letter; margin: 0.4in 0.3in; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Main view                                                                 */
/* -------------------------------------------------------------------------- */

export default function PdfReport({
  result,
  patientName,
  createdAt,
  bun,
}: PdfReportProps) {
  const chartData: ChartData = useMemo(
    () => transformPredictResponse(result),
    [result],
  );

  const trajectoryById = useMemo(
    () => new Map(chartData.trajectories.map((t) => [t.id, t])),
    [chartData.trajectories],
  );

  const scenarios = SCENARIO_META.map((meta) => {
    const traj = trajectoryById.get(meta.id);
    const fiveYear = traj ? valueAtMonth(traj, 60) : null;
    const tenYear = traj ? valueAtMonth(traj, 120) : null;
    const dialysisAge = traj ? traj.dialysisAge : null;
    const heartColor = traj ? traj.color : "#000";
    return { ...meta, traj, fiveYear, tenYear, dialysisAge, heartColor };
  });

  const structuralFloor: StructuralFloor | undefined = result.structural_floor;
  const showFloor =
    structuralFloor !== undefined &&
    structuralFloor.suppression_points >= 0.5 &&
    bun !== null;

  const reportDate = formatReportDate(createdAt);
  const egfrBaseline = Math.round(result.egfr_baseline);

  return (
    <div
      id="pdf-ready"
      className={`kh-pdf ${manrope.variable} ${nunito.variable}`}
    >
      <style dangerouslySetInnerHTML={{ __html: PDF_CSS }} />
      <div className="page">
        {/* 1. Navy header */}
        <div className="hdr">KidneyHood.org</div>

        <div className="body-pad">
          {/* 2. Title + report date row */}
          <div className="meta">
            <div>
              <h1>Kidney Health Overview</h1>
              {patientName ? <div className="who">{patientName}</div> : null}
            </div>
            {reportDate ? (
              <div className="date">Report Date: {reportDate}</div>
            ) : null}
          </div>

          {/* 3. Chart card */}
          <h3 className="sec-title">Your Future Kidney Function</h3>
          <div className="chart-card">
            <EgfrChart data={chartData} chrome={false} />
            <div className="legend">
              {scenarios.map((s) => (
                <div key={s.id} className="it">
                  <Heart fill={s.heartColor} />
                  {s.legend}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Scenario Overview */}
          <h3 className="sec-title">Scenario Overview</h3>
          <div className="sc-pills" role="list">
            {scenarios.map((s) => (
              <div key={s.id} role="listitem" className={`sc-pill ${s.tone}`}>
                {s.label}
              </div>
            ))}
          </div>
          <div className="sc-cards">
            {scenarios.map((s) => (
              <div key={s.id} className={`sc-card ${s.tone}`}>
                <div className="row">
                  <div className="cell">
                    <div className="lbl">5 yr eGFR</div>
                    <div className="val">{formatEgfr(s.fiveYear)}</div>
                  </div>
                  <div className="cell">
                    <div className="lbl">10yr eGFR</div>
                    <div className="val">{formatEgfr(s.tenYear)}</div>
                  </div>
                </div>
                <div className="foot">
                  Dialysis:
                  <br />
                  {formatDialysisFooter(s.dialysisAge)}
                </div>
              </div>
            ))}
          </div>

          {/* 5. Explanation block */}
          <div className="explain-grid">
            <KidneyVisual />
            <div className="explain">
              <h3 className="sec-title">What Your Results Mean</h3>
              {showFloor && structuralFloor && bun !== null ? (
                <p>
                  Your reported eGFR is <strong>{egfrBaseline}</strong>. At
                  your current BUN of <strong>{Math.round(bun)}</strong>,
                  approximately{" "}
                  <strong>
                    {Math.round(structuralFloor.suppression_points)}
                  </strong>{" "}
                  {Math.round(structuralFloor.suppression_points) === 1
                    ? "point"
                    : "points"}{" "}
                  of that reading reflect BUN workload suppression, not
                  permanent damage. Your estimated structural capacity is eGFR{" "}
                  <strong>
                    {Math.round(structuralFloor.structural_floor_egfr)}
                  </strong>
                  .
                </p>
              ) : (
                <p>
                  Your reported eGFR is <strong>{egfrBaseline}</strong>. This
                  chart shows how your kidney function may change over the
                  next 10 years under four possible BUN scenarios — use the
                  scenario cards above to compare outcomes.
                </p>
              )}
            </div>
          </div>

          {/* 6. Disclaimer + brand footer */}
          <div className="fine-line">
            This tool is for informational purposes only and does not
            constitute medical advice.
            <br />
            Consult your healthcare provider before making any decisions
            about your kidney health.
          </div>
          <div className="foot-brand">KidneyHood.org</div>
        </div>
      </div>
    </div>
  );
}
