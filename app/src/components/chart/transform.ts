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
export const TRAJECTORY_CONFIG = {
  bun_lte_12: {
    id: "bun_lte_12" as TrajectoryId,
    label: "BUN ≤ 12",
    color: "#1D9E75",
    strokeWidth: 2.5,
  },
  bun_13_17: {
    id: "bun_13_17" as TrajectoryId,
    label: "BUN 13–17",
    color: "#378ADD",
    strokeDasharray: "8,4",
    strokeWidth: 2.5,
  },
  bun_18_24: {
    id: "bun_18_24" as TrajectoryId,
    label: "BUN 18–24",
    color: "#85B7EB",
    strokeDasharray: "4,4",
    strokeWidth: 2.0,
  },
  no_treatment: {
    id: "no_treatment" as TrajectoryId,
    label: "No Treatment",
    color: "#AAAAAA",
    strokeDasharray: "2,4",
    strokeWidth: 2.0,
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
    bun_ratio: 0.47,
  },
};
