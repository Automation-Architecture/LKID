// Transform raw API response to ChartData shape (LKID-19)

import type {
  ChartData,
  DataPoint,
  PhaseDefinition,
  PredictResponse,
  TrajectoryData,
  TrajectoryId,
} from "./types";

// `satisfies` gives strict key checking against TrajectoryId while preserving
// literal types for each entry (avoids the looseness of Record<string, ...>).
//
// Trajectory colors — design-source palette per `project/Results.html:23-35`
// and lines 426-432.
//
// *** Binding policy: Brad 2026-04-29 (LKID-89) ***
// Chart trajectory line strokes use design hex exactly. This intentionally
// overrides the AA palette from LKID-67 on the four chart lines only — pills,
// cards, text, icons, and the dialysis-zone label outside the chart keep
// their AA tokens. The "Palette A+ hybrid" decision in
// `agents/inga/drafts/chart-palette-decision.md` is narrowed accordingly:
// chart **lines** = design hex; everything else = AA tokens.
//
// Brad accepts a WCAG AA contrast regression on the yellow line
// (`#D4A017` = 2.38:1 vs. white, fails both 3:1 graphical and 4.5:1 text
// thresholds). The axe test suite scopes the waiver narrowly to the chart
// `<svg data-testid="egfr-chart-svg">` only — every other SVG, page
// chrome, nav, buttons, and text remain audited. The narrow exclusion is
// time-bound: see `TODO(LKID-89)` in `app/tests/a11y/accessibility.spec.ts`,
// to be removed once the LKID-81 visual-regression suite verifies the
// chart palette by visual diff.
//
// Semantic meaning flows pill ↔ line through hue family (green ↔ green,
// navy ↔ navy, gold ↔ gold, gray ↔ gray).
//
// Stroke pattern: solid 2.5px with round linecap on all four lines. No
// dash patterns on lines — design brief was explicit.
export const TRAJECTORY_CONFIG = {
  bun_lte_12: {
    id: "bun_lte_12" as TrajectoryId,
    label: "BUN ≤ 12",
    color: "#3FA35B", // design --s-green — 3.14:1 on white (FAILS AA 4.5:1 text; barely passes 3:1 graphical) — LKID-80
    strokeWidth: 2.5,
  },
  bun_13_17: {
    id: "bun_13_17" as TrajectoryId,
    label: "BUN 13–17",
    color: "#1F2577", // design --s-blue (brand navy) — 13.26:1 on white (PASS AAA)
    strokeWidth: 2.5,
  },
  bun_18_24: {
    id: "bun_18_24" as TrajectoryId,
    label: "BUN 18–24",
    color: "#D4A017", // design source (Results.html:430) — 2.38:1 on white (FAILS AA, intentional per LKID-80)
    strokeWidth: 2.5,
  },
  no_treatment: {
    id: "no_treatment" as TrajectoryId,
    label: "No Treatment",
    color: "#6B6E78", // design --s-gray — 5.08:1 on white (PASS AA text)
    strokeWidth: 2.5,
  },
  // LKID-90 AC-3 — synthetic combined mid scenario rendered as a single line
  // when ResultsView calls combineMidScenarios(). Engine still returns the
  // separate bun_13_17 + bun_18_24 series; this fold happens at display time.
  // Color matches the existing yellow line so the AA exemption (LKID-89)
  // still applies to chart strokes only.
  bun_13_24: {
    id: "bun_13_24" as TrajectoryId,
    label: "BUN 13–24",
    color: "#D4A017",
    strokeWidth: 2.5,
  },
} satisfies Record<
  TrajectoryId,
  {
    id: TrajectoryId;
    label: string;
    color: string;
    strokeDasharray?: string;
    strokeWidth: number;
  }
>;

/**
 * Build phase definitions using the dialysis threshold from the API response.
 * The "Dialysis Zone" band spans 0 → threshold; "Severe" spans threshold → 30.
 */
export function buildPhaseDefinitions(dialysisThreshold: number): PhaseDefinition[] {
  return [
    {
      label: "Normal/Mild",
      yStart: 90,
      yEnd: 60,
      fillColor: "#E8F5F0",
      opacity: 0.3,
    },
    {
      label: "Moderate",
      yStart: 60,
      yEnd: 30,
      fillColor: "#FFF8E1",
      opacity: 0.3,
    },
    {
      label: "Severe",
      yStart: 30,
      yEnd: dialysisThreshold,
      fillColor: "#FDECEA",
      opacity: 0.2,
    },
    {
      label: "Dialysis Zone",
      yStart: dialysisThreshold,
      yEnd: 0,
      fillColor: "#F5F5F5",
      opacity: 0.3,
    },
  ];
}

/**
 * Zip trajectory values with time points up to the shorter length.
 * Missing trailing values are omitted rather than filled with 0, which
 * would plot spurious eGFR drops on the chart.
 */
function zipPoints(values: number[], timePoints: number[]): DataPoint[] {
  const len = Math.min(values.length, timePoints.length);
  const result: DataPoint[] = [];
  for (let i = 0; i < len; i++) {
    result.push({ monthsFromBaseline: timePoints[i], egfr: values[i] });
  }
  return result;
}

/**
 * Merge all plotted months across trajectories into one sorted array.
 * Used for the SR-only data table so all time columns are represented,
 * even if individual trajectories are shorter than the full 10-year range.
 */
export function mergedTimePoints(trajectories: TrajectoryData[]): number[] {
  const seen = new Set<number>();
  for (const traj of trajectories) {
    for (const pt of traj.points) {
      seen.add(pt.monthsFromBaseline);
    }
  }
  return [...seen].sort((a, b) => a - b);
}

export function transformPredictResponse(response: PredictResponse): ChartData {
  const {
    trajectories,
    time_points_months,
    dial_ages,
    egfr_baseline,
    confidence_tier = 1,
    dialysis_threshold,
  } = response;

  const trajectoryData: TrajectoryData[] = [
    {
      ...TRAJECTORY_CONFIG.bun_lte_12,
      points: zipPoints(trajectories.bun_12, time_points_months),
      finalEgfr: trajectories.bun_12[trajectories.bun_12.length - 1] ?? egfr_baseline,
      dialysisAge: dial_ages.bun_12,
    },
    {
      ...TRAJECTORY_CONFIG.bun_13_17,
      points: zipPoints(trajectories.bun_13_17, time_points_months),
      finalEgfr: trajectories.bun_13_17[trajectories.bun_13_17.length - 1] ?? egfr_baseline,
      dialysisAge: dial_ages.bun_13_17,
    },
    {
      ...TRAJECTORY_CONFIG.bun_18_24,
      points: zipPoints(trajectories.bun_18_24, time_points_months),
      finalEgfr: trajectories.bun_18_24[trajectories.bun_18_24.length - 1] ?? egfr_baseline,
      dialysisAge: dial_ages.bun_18_24,
    },
    {
      ...TRAJECTORY_CONFIG.no_treatment,
      points: zipPoints(trajectories.no_treatment, time_points_months),
      finalEgfr: trajectories.no_treatment[trajectories.no_treatment.length - 1] ?? egfr_baseline,
      dialysisAge: dial_ages.no_treatment,
    },
  ];

  return {
    trajectories: trajectoryData,
    phases: buildPhaseDefinitions(dialysis_threshold),
    dialysisThreshold: dialysis_threshold,
    confidenceTier: confidence_tier,
    baselineEgfr: egfr_baseline,
  };
}

/**
 * LKID-90 AC-3 — fold the separate bun_13_17 + bun_18_24 series into one
 * averaged "BUN 13–24" line for display. Returns a new ChartData with three
 * trajectories (BUN ≤ 12, BUN 13–24, No Treatment).
 *
 * Per Lee 2026-04-09 ("the outcomes are not that different"), the chart and
 * scenario UI collapse to a Best / Mid / None spectrum. Engine output is
 * unchanged — the original 4 series are still in `data.trajectories`; this
 * helper produces a derived view, which is what ResultsView passes to the
 * chart and uses to drive the scenario cards/legend/pills.
 */
export function combineMidScenarios(data: ChartData): ChartData {
  const byId = new Map(data.trajectories.map((t) => [t.id, t]));
  const best = byId.get("bun_lte_12");
  const mid17 = byId.get("bun_13_17");
  const mid24 = byId.get("bun_18_24");
  const none = byId.get("no_treatment");

  // If either source mid trajectory is missing, fall back to the original
  // trajectory list so the chart still renders something coherent.
  if (!best || !mid17 || !mid24 || !none) return data;

  // Average per-point. Both engine series share the same TIME_POINTS_MONTHS
  // grid, so a paired index walk is correct.
  const len = Math.min(mid17.points.length, mid24.points.length);
  const points: DataPoint[] = [];
  for (let i = 0; i < len; i++) {
    const a = mid17.points[i];
    const b = mid24.points[i];
    points.push({
      monthsFromBaseline: a.monthsFromBaseline,
      egfr: (a.egfr + b.egfr) / 2,
    });
  }

  // Average the two source dialysisAges when both are non-null; otherwise null.
  const dialysisAge =
    mid17.dialysisAge !== null && mid24.dialysisAge !== null
      ? (mid17.dialysisAge + mid24.dialysisAge) / 2
      : null;

  const finalEgfr = points.length > 0 ? points[points.length - 1].egfr : data.baselineEgfr;

  const combined: TrajectoryData = {
    ...TRAJECTORY_CONFIG.bun_13_24,
    points,
    finalEgfr,
    dialysisAge,
  };

  return {
    ...data,
    trajectories: [best, combined, none],
  };
}

/**
 * Mock data for development — matches the v2.0 backend snake_case response shape exactly.
 * dial_ages values are patient age in years (not months), as computed by the engine.
 */
export const MOCK_PREDICT_RESPONSE: PredictResponse = {
  egfr_baseline: 38,
  confidence_tier: 2,
  dialysis_threshold: 12.0,
  bun_suppression_estimate: 7.8,
  trajectories: {
    no_treatment: [38, 36, 34, 32, 30, 27, 24, 19, 16, 13, 11, 10, 9, 8, 7],
    bun_18_24:    [38, 37, 37, 36, 36, 35, 35, 34, 33, 33, 32, 32, 31, 31, 30],
    bun_13_17:    [38, 38, 39, 40, 41, 42, 44, 46, 48, 49, 50, 51, 51, 52, 52],
    bun_12:       [38, 39, 41, 43, 46, 49, 53, 58, 62, 65, 67, 68, 69, 70, 71],
  },
  time_points_months: [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120],
  dial_ages: { no_treatment: 68.2, bun_18_24: null, bun_13_17: null, bun_12: null },
  // BUN = 25 (> 17) → structural floor present in mock
  structural_floor: {
    structural_floor_egfr: 42.7,
    suppression_points: 4.7,
  },
};
