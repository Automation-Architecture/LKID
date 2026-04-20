"use client";

/**
 * LKID-63 — /results/[token] — Results view (no auth, tokenized).
 * LKID-76 — Design parity rebuild per project/Results.html.
 *
 * On mount GETs /results/[token]:
 *   • 404/410 → "invalid or expired" card.
 *   • 200 + captured=false → router.replace to /gate/[token] (force the
 *     user through the email gate — direct access attempts fall back to
 *     the gate).
 *   • 200 + captured=true → render the full Results surface:
 *       - Navy nav + brand footer (shared chrome matching Landing/Labs)
 *       - "Kidney Health Overview" H1 (Manrope 700) + top Download pill
 *       - Chart card with visx trajectory + scenarios legend
 *       - Scenario Overview (4 pills + 4 tinted cards with 5yr/10yr + dialysis)
 *       - "What Your Results Mean" block with blue kidney visual + second
 *         Download pill + fine-print disclaimer
 *       - Edit CTA as a full navy pill (not a text link)
 *
 * The layout is locally scoped via `.kh-results` to mirror the pattern used
 * on `/` and `/labs` (inlined CSS + `next/font/google` variables) so one
 * bad selector cannot bleed into the client dashboard.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Manrope, Nunito_Sans } from "next/font/google";
import { use, useEffect, useState } from "react";
import {
  EgfrChart,
  transformPredictResponse,
  type ChartData,
  type PredictResponse,
  type TrajectoryData,
} from "@/components/chart";
import { API_BASE, apiUrl } from "@/lib/api";
import { posthog } from "@/lib/posthog-provider";

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

/**
 * LKID-71 bun_tier derivation — mirrors `backend/services/klaviyo_service.py::_bun_tier`.
 * Kept in sync so PostHog funnel properties align with Klaviyo segmentation.
 * Non-PII: a 4-bucket label, never the raw value.
 */
function bunTier(bun: number | null): string {
  if (bun === null || !Number.isFinite(bun)) return "unknown";
  if (bun <= 12) return "<=12";
  if (bun <= 17) return "13-17";
  if (bun <= 24) return "18-24";
  return ">24";
}

/**
 * LKID-71 CKD stage bucketing — KDIGO boundaries.
 * Emits a stage label (e.g. "stage_3a") instead of the raw eGFR number so
 * PostHog never receives a lab value. Keep in sync with the provider docstring.
 */
function ckdStage(egfr: number | null | undefined): string {
  if (egfr === null || egfr === undefined || !Number.isFinite(egfr)) return "unknown";
  if (egfr >= 90) return "stage_1";
  if (egfr >= 60) return "stage_2";
  if (egfr >= 45) return "stage_3a";
  if (egfr >= 30) return "stage_3b";
  if (egfr >= 15) return "stage_4";
  return "stage_5";
}

interface ResultsApiResponse {
  report_token: string;
  captured: boolean;
  created_at: string;
  result: PredictResponse;
  inputs?: { bun?: number } | null;
  lead?: { name?: string; email_captured_at?: string | null } | null;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; data: ResultsApiResponse; chart: ChartData }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

/* -------------------------------------------------------------------------- */
/*  Inline styles — mirrors project/Results.html                              */
/*  Scoped under .kh-results to avoid leaking into /client/* dashboard chrome.*/
/* -------------------------------------------------------------------------- */

const RESULTS_CSS = `
.kh-results {
  --navy: var(--kh-navy);
  --navy-deep: var(--kh-navy-deep);
  --ink: var(--kh-ink);
  --ink-2: var(--kh-ink-2);
  --body: var(--kh-body);
  --muted: var(--kh-muted);
  --bg: var(--kh-bg);
  --card-bg: #FFFFFF;
  --border: var(--kh-border);
  --shadow-md: 0 6px 20px rgba(20, 28, 70, 0.06);
  --shadow-lg: 0 20px 50px rgba(20, 28, 70, 0.12);

  font-family: var(--font-nunito), 'Nunito Sans', system-ui, sans-serif;
  background: var(--bg);
  color: var(--ink);
  font-size: 16px;
  line-height: 1.55;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.kh-results *, .kh-results *::before, .kh-results *::after { box-sizing: border-box; }

/* ---------- Nav ---------- */
.kh-results .nav {
  background: var(--navy);
  color: #fff;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.kh-results .nav .brand {
  color: #fff;
  font-weight: 700;
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  letter-spacing: -0.01em;
  font-size: 16px;
  text-decoration: none;
}

/* ---------- Main layout ---------- */
.kh-results main {
  padding: 40px 24px 80px;
  flex: 1 0 auto;
}
.kh-results .wrap { max-width: 1100px; margin: 0 auto; }

.kh-results .page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.kh-results h1.title {
  margin: 0;
  font-size: clamp(28px, 3.6vw, 44px);
  color: var(--ink);
  font-weight: 700;
  letter-spacing: -0.01em;
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  line-height: 1.1;
}

/* ---------- Download / Edit pills ---------- */
.kh-results .dl-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--navy);
  color: #fff;
  padding: 11px 16px 11px 22px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 0;
  font-family: inherit;
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.6), 0 0 0 7px rgba(31, 37, 119, 0.14);
  text-decoration: none;
  min-height: auto;
  transition: transform 0.15s, background 0.15s;
}
.kh-results .dl-pill:hover,
.kh-results .dl-pill:focus-visible {
  transform: translateY(-1px);
  background: var(--navy-deep);
  color: #fff;
}
.kh-results .dl-pill .pdf-ico {
  width: 30px;
  height: 30px;
  background: #fff;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: var(--navy);
}
.kh-results .dl-pill .pdf-ico svg { width: 14px; height: 14px; }

/* ---------- Cards ---------- */
.kh-results .card {
  background: #fff;
  border-radius: 14px;
  padding: 24px 28px;
  box-shadow: var(--shadow-md);
}
.kh-results .section-title {
  color: var(--navy);
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
}
.kh-results .section-title::before {
  content: "";
  width: 9px;
  height: 9px;
  background: var(--navy);
  border-radius: 999px;
}

/* ---------- Chart card ---------- */
.kh-results .chart-card {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 28px;
  align-items: start;
}
.kh-results .chart-box { min-width: 0; }
.kh-results .scenarios-legend {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 30px;
}
.kh-results .legend-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--ink-2);
  font-weight: 500;
}
.kh-results .legend-row .heart {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

/* ---------- Scenario Overview ---------- */
.kh-results .overview {
  margin-top: 36px;
}
.kh-results .overview-head { margin-bottom: 18px; }

.kh-results .scenario-pills {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}
.kh-results .sc-pill {
  text-align: center;
  border-radius: 999px;
  padding: 11px 16px;
  font-weight: 700;
  font-size: 15px;
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  border: 1px solid transparent;
  min-height: auto;
}
/* Pills + scenario card numerics use the -text tokens (AA-safe on the
 * tinted backgrounds); chart dots / icons keep the brighter --s-{color}. */
.kh-results .sc-pill.green  { background: var(--s-green-bg);  color: var(--s-green-text);  border-color: var(--s-green-border); }
.kh-results .sc-pill.blue   { background: var(--s-blue-bg);   color: var(--s-blue-text);   border-color: var(--s-blue-border); }
.kh-results .sc-pill.yellow { background: var(--s-yellow-bg); color: var(--s-yellow-text); border-color: var(--s-yellow-border); }
.kh-results .sc-pill.gray   { background: var(--s-gray-bg);   color: var(--s-gray-text);   border-color: var(--s-gray-border); }

.kh-results .scenario-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.kh-results .sc-card {
  border-radius: 14px;
  padding: 16px 18px 18px;
  border: 1px solid transparent;
  background: #fff;
}
.kh-results .sc-card.green  { background: var(--s-green-bg);  border-color: var(--s-green-border); }
.kh-results .sc-card.blue   { background: #F4F5FA;            border-color: var(--s-blue-border); }
.kh-results .sc-card.yellow { background: var(--s-yellow-bg); border-color: var(--s-yellow-border); }
.kh-results .sc-card.gray   { background: #F4F5F7;            border-color: var(--s-gray-border); }

.kh-results .sc-card .row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 10px;
}
.kh-results .sc-card .cell .lbl {
  font-size: 11px;
  color: var(--muted);
  font-weight: 600;
  margin-bottom: 4px;
}
.kh-results .sc-card .cell .val {
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.01em;
}
.kh-results .sc-card.green .val  { color: var(--s-green-text); }
.kh-results .sc-card.blue .val   { color: var(--s-blue-text); }
.kh-results .sc-card.yellow .val { color: var(--s-yellow-text); }
.kh-results .sc-card.gray .val   { color: var(--s-gray-text); }
.kh-results .sc-card .foot {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
}

/* ---------- Explanation + kidney ---------- */
.kh-results .explain-grid {
  margin-top: 36px;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 28px;
  align-items: center;
}
.kh-results .kidney-visual {
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  background: radial-gradient(circle at 50% 50%, #fff 55%, transparent 70%);
  position: relative;
  max-width: 320px;
}
.kh-results .kidney-visual::before,
.kh-results .kidney-visual::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(31, 37, 119, 0.08);
}
.kh-results .kidney-visual::before { inset: 6%; }
.kh-results .kidney-visual::after  { inset: 14%; }
.kh-results .kidney-visual svg {
  position: absolute;
  inset: 18%;
  width: 64%;
  height: 64%;
  filter: drop-shadow(0 12px 24px rgba(31, 122, 180, 0.35));
}

.kh-results .explain-card p {
  color: var(--body);
  font-size: 14px;
  margin: 0 0 22px;
  line-height: 1.6;
  max-width: 540px;
}
.kh-results .explain-cta {
  display: flex;
  justify-content: center;
  margin: 8px 0 16px;
}
.kh-results .fine {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
  margin: 0;
}

/* ---------- Edit CTA ---------- */
.kh-results .edit-row {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}
.kh-results .edit-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--navy);
  color: #fff;
  padding: 14px 34px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.7), 0 0 0 7px rgba(31, 37, 119, 0.16);
  min-height: auto;
  transition: transform 0.15s, background 0.15s;
  font-family: inherit;
  border: 0;
  cursor: pointer;
}
.kh-results .edit-pill:hover,
.kh-results .edit-pill:focus-visible {
  transform: translateY(-1px);
  background: var(--navy-deep);
  color: #fff;
}

/* ---------- Error / invalid cards ---------- */
.kh-results .message-card {
  margin: 48px auto 0;
  max-width: 520px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 32px 28px;
  text-align: center;
  box-shadow: var(--shadow-md);
}
.kh-results .message-card h1 {
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 12px;
}
.kh-results .message-card p {
  color: var(--body);
  font-size: 15px;
  margin: 0 0 24px;
}

/* ---------- Footer ---------- */
.kh-results footer.kh-foot {
  background: var(--bg);
  padding: 28px 24px 48px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
  flex-shrink: 0;
}
.kh-results .kh-foot .brand-foot {
  color: var(--navy);
  font-weight: 700;
  font-family: var(--font-manrope), 'Manrope', sans-serif;
  font-size: 16px;
  margin-bottom: 10px;
}
.kh-results .kh-foot nav {
  display: flex;
  gap: 24px;
  justify-content: center;
}
.kh-results .kh-foot a {
  color: var(--muted);
  text-decoration: none;
  min-height: auto;
  padding: 2px 0;
}
.kh-results .kh-foot a:hover,
.kh-results .kh-foot a:focus-visible { color: var(--ink-2); }

/* ---------- Structural-floor callout (Amendment 3) ---------- */
.kh-results .structural-callout {
  margin-top: 20px;
  border-radius: 10px;
  border: 1px solid rgba(31, 37, 119, 0.18);
  background: rgba(31, 37, 119, 0.04);
  padding: 14px 18px;
}
.kh-results .structural-callout p {
  margin: 0;
  font-size: 14px;
  color: var(--ink-2);
  line-height: 1.55;
}
.kh-results .structural-callout strong { color: var(--ink); }

/* ---------- Skeleton ---------- */
.kh-results .skeleton {
  background: #F0F2F5;
  border-radius: 12px;
  animation: kh-pulse 1.4s ease-in-out infinite;
}
@keyframes kh-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}

/* ---------- Responsive ---------- */
@media (max-width: 880px) {
  .kh-results main { padding: 20px 16px 40px; }
  .kh-results .page-head { justify-content: center; text-align: center; }
  .kh-results h1.title { font-size: 26px; font-weight: 800; }
  .kh-results .dl-pill.top-pill { display: none; }

  .kh-results .chart-card { grid-template-columns: 1fr; gap: 16px; }
  .kh-results .scenarios-legend { padding-top: 0; flex-direction: column; gap: 10px; }

  .kh-results .scenario-pills,
  .kh-results .scenario-cards { grid-template-columns: 1fr; gap: 10px; }

  .kh-results .explain-grid { grid-template-columns: 1fr; gap: 20px; }
  .kh-results .kidney-visual { max-width: 220px; margin: 0 auto; order: 2; }
  .kh-results .explain-card { order: 1; }

  .kh-results .card { padding: 16px 14px; border-radius: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .kh-results .dl-pill:hover,
  .kh-results .dl-pill:focus-visible,
  .kh-results .edit-pill:hover,
  .kh-results .edit-pill:focus-visible { transform: none; }
  .kh-results .skeleton { animation: none; }
}
`;

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Find the index of a target month in time_points_months with a small
 * tolerance. Used to extract the 5yr (60 months) and 10yr (120 months)
 * eGFR values from each trajectory without assuming a fixed array shape.
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

const SCENARIO_META = [
  { id: "bun_lte_12" as const, label: "BUN ≤ 12", tone: "green" as const },
  { id: "bun_13_17" as const, label: "BUN 13-17", tone: "blue" as const },
  { id: "bun_18_24" as const, label: "BUN 18-24", tone: "yellow" as const },
  { id: "no_treatment" as const, label: "No Treatment", tone: "gray" as const },
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

function StructuralFloorCallout({
  egfrBaseline,
  bun,
  suppressionPoints,
  structuralEgfr,
}: {
  egfrBaseline: number;
  bun: number;
  suppressionPoints: number;
  structuralEgfr: number;
}) {
  const reported = Math.round(egfrBaseline);
  const suppression = Math.round(suppressionPoints);
  const structural = Math.round(structuralEgfr);
  const bunValue = Math.round(bun);

  return (
    <aside
      aria-label="BUN structural floor estimate"
      className="structural-callout"
      data-testid="structural-floor-callout"
    >
      <p>
        Your reported eGFR is <strong>{reported}</strong>. At your current BUN of{" "}
        <strong>{bunValue}</strong>, approximately <strong>{suppression}</strong>{" "}
        {suppression === 1 ? "point" : "points"} of that reading reflect BUN workload
        suppression, not permanent damage. Your estimated structural capacity is eGFR{" "}
        <strong>{structural}</strong>.
      </p>
    </aside>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" data-testid="results-loading-skeleton">
      <div className="page-head">
        <div className="skeleton" style={{ height: 44, width: 340 }} />
        <div className="skeleton" style={{ height: 48, width: 240, borderRadius: 999 }} />
      </div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 300, width: "100%" }} />
      </div>
      <div className="skeleton" style={{ height: 220, width: "100%" }} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function ResultsTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { token } = use(params);

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [inputBun, setInputBun] = useState<number | null>(null);

  // LKID-71: fire `results_viewed` exactly once per successful mount.
  useEffect(() => {
    if (state.kind !== "ready") return;
    posthog.capture("results_viewed", {
      report_token_prefix: token.slice(0, 8),
      ckd_stage: ckdStage(state.data.result.egfr_baseline),
      bun_tier: bunTier(inputBun),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, token]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(apiUrl(`/results/${encodeURIComponent(token)}`), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;

        if (res.status === 404 || res.status === 410) {
          setState({ kind: "invalid" });
          return;
        }
        if (!res.ok) {
          setState({
            kind: "error",
            message: "Something went wrong loading your report. Please try again.",
          });
          return;
        }

        const data = (await res.json()) as ResultsApiResponse;
        if (!data.captured) {
          router.replace(`/gate/${encodeURIComponent(token)}`);
          return;
        }
        setInputBun(typeof data.inputs?.bun === "number" ? data.inputs.bun : null);
        setState({
          kind: "ready",
          data,
          chart: transformPredictResponse(data.result),
        });
      } catch {
        if (cancelled) return;
        setState({
          kind: "error",
          message: "Unable to reach the prediction service. Please try again.",
        });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const pdfHref = `${API_BASE}/reports/${encodeURIComponent(token)}/pdf`;

  const handlePdfClick = () => {
    posthog.capture("pdf_downloaded", {
      report_token_prefix: token.slice(0, 8),
    });
  };

  // Chrome (nav + footer) is shared across loading / ready / error states so
  // the /results/* surface always renders the same navy brand + footer the
  // audit flagged as missing. Inner content varies by state.
  const renderBody = () => {
    if (state.kind === "invalid") {
      return (
        <div className="message-card">
          <h1 role="alert">This report link is invalid or has expired</h1>
          <p>
            We couldn&apos;t find your report. Please re-enter your lab values to get a fresh
            prediction.
          </p>
          <Link href="/labs" className="edit-pill">
            Start a new check
          </Link>
        </div>
      );
    }
    if (state.kind === "error") {
      return (
        <div className="message-card">
          <h1 role="alert">Something went wrong</h1>
          <p>{state.message}</p>
          <Link href="/labs" className="edit-pill">
            Start a new check
          </Link>
        </div>
      );
    }
    if (state.kind === "loading") {
      return (
        <div className="wrap">
          <LoadingSkeleton />
        </div>
      );
    }

    // ---------- Ready ----------
    const { chart, data } = state;
    const trajectoryById = new Map(chart.trajectories.map((t) => [t.id, t]));

    const scenarios = SCENARIO_META.map((meta) => {
      const traj = trajectoryById.get(meta.id);
      const fiveYear = traj ? valueAtMonth(traj, 60) : null;
      const tenYear = traj ? valueAtMonth(traj, 120) : null;
      const dialysisAge = traj ? traj.dialysisAge : null;
      const heartColor = traj ? traj.color : "#000";
      return { ...meta, traj, fiveYear, tenYear, dialysisAge, heartColor };
    });

    const structural = data.result.structural_floor;
    const showStructural =
      structural !== undefined &&
      structural.suppression_points >= 0.5 &&
      inputBun !== null;

    return (
      <div className="wrap">
        <div className="page-head">
          <h1 className="title" data-testid="results-heading">
            Kidney Health Overview
          </h1>
          <DownloadPill
            href={pdfHref}
            onClick={handlePdfClick}
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
                <EgfrChart data={chart} />
              </section>
            </div>
            <div className="scenarios-legend">
              <h3 className="section-title">Scenarios</h3>
              {scenarios.map((s) => (
                <div key={s.id} className="legend-row">
                  <Heart fill={s.heartColor} />
                  {s.tone === "green" && "Healthy range"}
                  {s.tone === "blue" && "Stable range"}
                  {s.tone === "yellow" && "Higher risk"}
                  {s.tone === "gray" && "No treatment"}
                </div>
              ))}
            </div>
          </div>
          {showStructural && (
            <StructuralFloorCallout
              egfrBaseline={data.result.egfr_baseline}
              bun={inputBun}
              suppressionPoints={structural.suppression_points}
              structuralEgfr={structural.structural_floor_egfr}
            />
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
            {showStructural ? (
              <p>
                Your reported eGFR is{" "}
                <strong>{Math.round(data.result.egfr_baseline)}</strong>. At your current BUN
                of <strong>{Math.round(inputBun ?? 0)}</strong>, approximately{" "}
                <strong>{Math.round(structural.suppression_points)}</strong>{" "}
                {Math.round(structural.suppression_points) === 1 ? "point" : "points"} of that
                reading reflect BUN workload suppression, not permanent damage. Your estimated
                structural capacity is eGFR{" "}
                <strong>{Math.round(structural.structural_floor_egfr)}</strong>.
              </p>
            ) : (
              <p>
                Your reported eGFR is{" "}
                <strong>{Math.round(data.result.egfr_baseline)}</strong>. This chart shows how
                your kidney function may change over the next 10 years under four possible BUN
                scenarios — use the scenario cards below to compare outcomes.
              </p>
            )}
            <div className="explain-cta">
              <DownloadPill href={pdfHref} onClick={handlePdfClick} id="download-bottom" />
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
  };

  return (
    <div className={`kh-results ${manrope.variable} ${nunito.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: RESULTS_CSS }} />
      <nav className="nav" aria-label="Main navigation">
        <Link href="/" className="brand">
          KidneyHood.org
        </Link>
      </nav>
      <main id="main-content">{renderBody()}</main>
      <footer className="kh-foot">
        <div className="brand-foot">KidneyHood.org</div>
        <nav aria-label="Footer navigation">
          <Link href="/#privacy">Privacy</Link>
          <Link href="/#disclaimer">Disclaimer</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
      </footer>
    </div>
  );
}
