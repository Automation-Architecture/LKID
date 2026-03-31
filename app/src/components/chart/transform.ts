// Transform raw API response to ChartData shape (LKID-19)

import type {
  ChartData,
  DataPoint,
  PhaseDefinition,
  PredictResponse,
  TrajectoryData,
} from "./types";

export const TRAJECTORY_CONFIG: Record<
  string,
  {
    id: TrajectoryData["id"];
    label: string;
    color: string;
    strokeDasharray?: string;
    strokeWidth: number;
  }
> = {
  bun_lte_12: {
    id: "bun_lte_12",
    label: "BUN \u2264 12",
    color: "#1D9E75",
    strokeWidth: 2.5,
  },
  bun_13_17: {
    id: "bun_13_17",
    label: "BUN 13\u201317",
    color: "#378ADD",
    strokeDasharray: "8,4",
    strokeWidth: 2.5,
  },
  bun_18_24: {
    id: "bun_18_24",
    label: "BUN 18\u201324",
    color: "#85B7EB",
    strokeDasharray: "4,4",
    strokeWidth: 2.0,
  },
  no_treatment: {
    id: "no_treatment",
    label: "No Treatment",
    color: "#AAAAAA",
    strokeDasharray: "2,4",
    strokeWidth: 2.0,
  },
};

export const PHASE_DEFINITIONS: PhaseDefinition[] = [
  {
    label: "Normal/Mild",
    yStart: 90, // top of band; extends to yMax
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
    yEnd: 15,
    fillColor: "#FDECEA",
    opacity: 0.2,
  },
  {
    label: "Dialysis Zone",
    yStart: 15,
    yEnd: 0,
    fillColor: "#F5F5F5",
    opacity: 0.3,
  },
];

function zipPoints(values: number[], timePoints: number[]): DataPoint[] {
  return timePoints.map((month, i) => ({
    monthsFromBaseline: month,
    egfr: values[i] ?? 0,
  }));
}

export function transformPredictResponse(response: PredictResponse): ChartData {
  const { trajectories, time_points_months, dial_ages, egfr_calculated, confidence_tier } =
    response;

  const trajectoryData: TrajectoryData[] = [
    {
      ...TRAJECTORY_CONFIG.bun_lte_12,
      points: zipPoints(trajectories.bun12, time_points_months),
      finalEgfr: trajectories.bun12[trajectories.bun12.length - 1] ?? egfr_calculated,
      dialysisAge: dial_ages.bun12,
    },
    {
      ...TRAJECTORY_CONFIG.bun_13_17,
      points: zipPoints(trajectories.bun17, time_points_months),
      finalEgfr: trajectories.bun17[trajectories.bun17.length - 1] ?? egfr_calculated,
      dialysisAge: dial_ages.bun17,
    },
    {
      ...TRAJECTORY_CONFIG.bun_18_24,
      points: zipPoints(trajectories.bun24, time_points_months),
      finalEgfr: trajectories.bun24[trajectories.bun24.length - 1] ?? egfr_calculated,
      dialysisAge: dial_ages.bun24,
    },
    {
      ...TRAJECTORY_CONFIG.no_treatment,
      points: zipPoints(trajectories.none, time_points_months),
      finalEgfr: trajectories.none[trajectories.none.length - 1] ?? egfr_calculated,
      dialysisAge: dial_ages.none,
    },
  ];

  return {
    trajectories: trajectoryData,
    phases: PHASE_DEFINITIONS,
    dialysisThreshold: 15,
    confidenceTier: confidence_tier,
    baselineEgfr: egfr_calculated,
  };
}

// Mock data for development (matches dispatch shape exactly)
export const MOCK_PREDICT_RESPONSE: PredictResponse = {
  egfr_calculated: 38,
  confidence_tier: 2,
  unlock_prompt: "Add 2 more visit dates to unlock trend analysis.",
  trajectories: {
    none:  [38, 36, 34, 32, 30, 27, 24, 19, 16, 13, 11, 10, 9, 8, 7],
    bun24: [38, 37, 37, 36, 36, 35, 35, 34, 33, 33, 32, 32, 31, 31, 30],
    bun17: [38, 38, 39, 40, 41, 42, 44, 46, 48, 49, 50, 51, 51, 52, 52],
    bun12: [38, 39, 41, 43, 46, 49, 53, 58, 62, 65, 67, 68, 69, 70, 71],
  },
  time_points_months: [0, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120],
  dial_ages: { none: 68, bun24: null, bun17: null, bun12: null },
  slope: -3.2,
  slope_description: "declining",
  visit_count: 3,
  created_at: "2026-03-25T12:00:00Z",
};
