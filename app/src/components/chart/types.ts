// Chart data types for the eGFR Trajectory chart (LKID-19)
// Matches the API response shape from POST /predict

export interface DataPoint {
  monthsFromBaseline: number;
  egfr: number;
}

export type TrajectoryId = "bun_lte_12" | "bun_13_17" | "bun_18_24" | "no_treatment";

export interface TrajectoryData {
  id: TrajectoryId;
  label: string;
  color: string;
  strokeDasharray?: string;
  strokeWidth: number;
  points: DataPoint[];
  finalEgfr: number;
  dialysisAge: number | null; // months to dialysis, null if never
}

export interface PhaseDefinition {
  label: string;
  yStart: number; // eGFR top of band
  yEnd: number;   // eGFR bottom of band
  fillColor: string;
  opacity: number;
}

export interface ChartData {
  trajectories: TrajectoryData[];
  phases: PhaseDefinition[];
  dialysisThreshold: number; // 15
  confidenceTier: 1 | 2;
  baselineEgfr: number;
}

// Raw API response shape from POST /predict
export interface PredictResponse {
  egfr_calculated: number;
  confidence_tier: 1 | 2;
  unlock_prompt: string;
  trajectories: {
    none: number[];
    bun24: number[];
    bun17: number[];
    bun12: number[];
  };
  time_points_months: number[];
  dial_ages: {
    none: number | null;
    bun24: number | null;
    bun17: number | null;
    bun12: number | null;
  };
  slope: number;
  slope_description: string;
  visit_count: number;
  created_at: string;
}

// Tooltip state
export interface TooltipData {
  trajectoryId: TrajectoryId;
  label: string;
  color: string;
  egfr: number;
  months: number;
}
