// app/src/components/results/ResultsView.tsx
//
// Pure-presentational composition of the LKID-76 Results surface.
// Renders inside the `.kh-results` wrapper owned by `app/src/app/results/[token]/page.tsx`
// (which also owns the fetch / loading / invalid / error states, navy nav + footer,
// RESULTS_CSS injection, and PostHog `results_viewed` capture on mount).
//
// All class names here reference the scoped `.kh-results *` selectors defined in
// page.tsx, which in turn pull from the `--s-{green|blue|yellow|gray}-*` design
// tokens in `app/src/app/globals.css` (PR #57 added the `-text` variants to pass
// WCAG AA on tinted backgrounds).
//
// Receives all data + the PDF `href` and click handler from the page wrapper.
// The component itself is `/results`-specific by design (carries the testids
// the E2E suite expects) and contains no network calls, no routing, and no
// sessionStorage touchpoints.

"use client";

import Link from "next/link";
import type { ChartData, StructuralFloor, TrajectoryData } from "@/components/chart/types";
import { EgfrChart } from "@/components/chart/EgfrChart";
import { selectDisplayTrajectories } from "@/components/chart/transform";

/* -------------------------------------------------------------------------- */
/*  Props — the stable contract                                               */
/* -------------------------------------------------------------------------- */

export interface ResultsViewProps {
  /** ChartData derived from `transformPredictResponse(response)` in the page. */
  data: ChartData;
  /** Optional patient name for the hero (not displayed by LKID-76 parity, reserved). */
  patientName?: string;
  /** Baseline eGFR from the raw prediction response (used by the explainer copy). */
  egfrBaseline: number;
  /** Amendment 3 BUN structural floor, when the API returns one. */
  structuralFloor?: StructuralFloor;
  /** Raw BUN input the user submitted — needed for the structural-floor callout. */
  inputBun: number | null;
  /** Absolute URL to the tokenized PDF endpoint (`GET /reports/{token}/pdf`). */
  pdfHref: string;
  /**
   * Click handler fired on both PDF pills (top + bottom) — used by the page
   * to emit `pdf_downloaded` to PostHog. The pills remain plain anchors so
   * browsers keep their native "open in new tab" semantics.
   */
  onPdfClick: () => void;
  /**
   * Reserved for a future async PDF mode (spinner state). Not used by the
   * current `<a href target="_blank">` pattern but kept in the contract so
   * page wrappers can opt into a fetch-based flow without changing the component.
   */
  pdfLoading?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Local helpers (identical semantics to the versions previously in page.tsx) */
/* -------------------------------------------------------------------------- */

/**
 * Find the value of a target month in a trajectory's points with a small
 * tolerance. Used to extract the 5yr (60) and 10yr (120) eGFR readings.
 */
function valueAtMonth(trajectory: TrajectoryData, targetMonths: number): number | null {
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
  if (dialysisAge === null || !Number.isFinite(dialysisAge)) return "Dialysis: Not projected";
  return `Dialysis: ~age ${Math.round(dialysisAge)} yr`;
}

/**
 * Scenario tone ↔ palette token mapping.
 *
 * `tone` selects one of the four scoped `.kh-results .sc-{pill,card}.{tone}`
 * rule blocks in `app/src/app/results/[token]/page.tsx` RESULTS_CSS, which
 * resolve to the `--s-{green|blue|yellow|gray}-{bg,border,text}` tokens in
 * `app/src/app/globals.css`. PR #57 introduced the `-text` variants so
 * large scenario numerics (32px Manrope-800) pass WCAG AA on the tinted
 * `-bg` surfaces:
 *
 *   green  → #2F7F45 text on rgba(108,194,74,.12) bg   → 4.53:1  (PASS AA)
 *   blue   → #1F2577 text on #F4F5FA bg                → 12.14:1 (PASS AAA)
 *   yellow → #92650C text on rgba(235,190,40,.14) bg   → 4.75:1  (PASS AA)
 *   gray   → #6B6E78 text on #F4F5F7 bg                → 4.66:1  (PASS AA)
 *
 * All four beat the 3:1 large-text threshold with room to spare; the first
 * three also clear the 4.5:1 body-text threshold. No hardcoded scenario
 * hexes live in this component — palette is CSS-variable-driven via the
 * scoped class names, so future palette edits flow from globals.css without
 * touching JSX.
 */
type ScenarioTone = "blue" | "gray";

// LKID-91 — Lee feedback (2026-04-30): chart simplifies to 2 displayed
// scenarios. The bun_13_17 trajectory is relabeled "BUN 12-17" and uses the
// blue (navy) tone — semantic continuity with the new single-line band.
// Engine still returns 4 trajectories upstream; selectDisplayTrajectories()
// filters to the 2 displayed lines before render.
const SCENARIO_META: {
  id: TrajectoryData["id"];
  label: string;
  tone: ScenarioTone;
  legend: string;
}[] = [
  { id: "bun_13_17", label: "BUN 12-17", tone: "blue", legend: "With BUN management" },
  { id: "no_treatment", label: "No Treatment", tone: "gray", legend: "No treatment" },
];

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function PdfIcon() {
  return (
    <span className="pdf-ico" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v12" />
        <path d="M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    </span>
  );
}

function DownloadPill({
  href,
  onClick,
  className,
  id,
  label = "Download Your Results",
}: {
  href: string;
  onClick?: () => void;
  className?: string;
  id?: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      id={id}
      onClick={onClick}
      className={`dl-pill ${className ?? ""}`.trim()}
      data-testid={id === "download-top" ? "results-pdf-link" : undefined}
    >
      {label}
      <PdfIcon />
    </a>
  );
}

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
          <radialGradient id="kh-results-kidney-grad" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#9ED6F5" />
            <stop offset="50%" stopColor="#3A90C6" />
            <stop offset="100%" stopColor="#1E5C8A" />
          </radialGradient>
        </defs>
        <path
          fill="url(#kh-results-kidney-grad)"
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
/*  Main view                                                                 */
/* -------------------------------------------------------------------------- */

export function ResultsView({
  data,
  egfrBaseline,
  structuralFloor,
  inputBun,
  pdfHref,
  onPdfClick,
}: ResultsViewProps) {
  // LKID-91 — chart simplifies to 2 displayed lines (BUN 12-17 + No
  // Treatment) per Lee feedback (2026-04-30). Engine output (4 series) is
  // unchanged in `data`; `displayData` is the 2-line view shared by the
  // chart, scenario pills, scenario cards, and heart-icon legend.
  const displayData = selectDisplayTrajectories(data);
  const trajectoryById = new Map(displayData.trajectories.map((t) => [t.id, t]));

  const scenarios = SCENARIO_META.map((meta) => {
    const traj = trajectoryById.get(meta.id);
    const fiveYear = traj ? valueAtMonth(traj, 60) : null;
    const tenYear = traj ? valueAtMonth(traj, 120) : null;
    const dialysisAge = traj ? traj.dialysisAge : null;
    const heartColor = traj ? traj.color : "#000";
    return { ...meta, traj, fiveYear, tenYear, dialysisAge, heartColor };
  });

  const showStructural =
    structuralFloor !== undefined &&
    structuralFloor.suppression_points >= 0.5 &&
    inputBun !== null;

  return (
    <div className="wrap">
      <div className="page-head">
        <h1 className="title" data-testid="results-heading">
          Kidney Health Overview
        </h1>
        <DownloadPill
          href={pdfHref}
          onClick={onPdfClick}
          className="top-pill"
          id="download-top"
        />
      </div>

      {/* Chart + scenarios legend */}
      <div className="card">
        <div className="chart-card">
          <div className="chart-box">
            <h3 className="section-title">Your Future Kidney Function</h3>
            <section aria-label="Your kidney health prediction">
              {/* chrome={false}: Results page owns section title, legend column,
                  and scenario cards — the chart renders as a bare SVG matching
                  project/Results.html per LKID-80. */}
              <EgfrChart data={displayData} chrome={false} />
            </section>
          </div>
          <div className="scenarios-legend">
            <h3 className="section-title">Scenarios</h3>
            {scenarios.map((s) => (
              <div key={s.id} className="legend-row">
                <Heart fill={s.heartColor} />
                {s.legend}
              </div>
            ))}
          </div>
        </div>
        {showStructural && structuralFloor && inputBun !== null && (
          <aside
            aria-label="BUN context for current eGFR reading"
            className="structural-callout"
            data-testid="structural-floor-callout"
          >
            <p>
              Your current eGFR is <strong>{Math.round(egfrBaseline)}</strong>. Your BUN
              of <strong>{Math.round(inputBun)}</strong> is high, which can temporarily
              lower the eGFR reading. Lowering your BUN may improve your kidney function
              reading toward your true baseline.
            </p>
          </aside>
        )}
      </div>

      {/* Scenario Overview: pills + tinted cards */}
      <section className="overview" aria-labelledby="overview-heading">
        <h3 id="overview-heading" className="section-title overview-head">
          Scenario Overview
        </h3>

        <div className="scenario-pills" role="list">
          {scenarios.map((s) => (
            <div key={s.id} role="listitem" className={`sc-pill ${s.tone}`}>
              {s.label}
            </div>
          ))}
        </div>

        <div className="scenario-cards">
          {scenarios.map((s) => (
            <div
              key={s.id}
              className={`sc-card ${s.tone}`}
              data-testid={`scenario-card-${s.id}`}
            >
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
              <div className="foot">{formatDialysisFooter(s.dialysisAge)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Explanation + kidney visual */}
      <div className="explain-grid">
        <KidneyVisual />
        <div className="card explain-card">
          <h3 className="section-title">What Your Results Mean</h3>
          {showStructural && structuralFloor && inputBun !== null ? (
            <p>
              Your current eGFR is <strong>{Math.round(egfrBaseline)}</strong>. Your BUN
              of <strong>{Math.round(inputBun)}</strong> is high, which can temporarily
              lower the eGFR reading. The chart below shows how your kidney function may
              change over the next 10 years — use the scenario cards to compare outcomes.
            </p>
          ) : (
            <p>
              Your current eGFR is <strong>{Math.round(egfrBaseline)}</strong>. This chart
              shows how your kidney function may change over the next 10 years under your
              BUN-management scenarios — use the scenario cards below to compare outcomes.
            </p>
          )}
          <div className="explain-cta">
            <DownloadPill href={pdfHref} onClick={onPdfClick} id="download-bottom" />
          </div>
          <p className="fine" data-testid="disclaimer-full-panel-desktop">
            This tool is for informational purposes only and does not constitute medical
            advice.
            <br />
            Consult your healthcare provider before making any decisions about your kidney
            health.
          </p>
        </div>
      </div>

      {/* Edit CTA */}
      <div className="edit-row">
        <Link href="/labs" className="edit-pill" data-testid="results-edit-link">
          &larr; Edit your information
        </Link>
      </div>
    </div>
  );
}
