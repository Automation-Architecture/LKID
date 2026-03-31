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
  /** Estimated patient age (in years) when eGFR drops below dialysis threshold. null if never within 10 years. */
  dialysisAge: number | null;
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
  dialysisThreshold: number; // from backend (currently 12.0)
  confidenceTier: 1 | 2;
  baselineEgfr: number;
}

/**
 * Amendment 3: BUN Structural Floor — display-only callout.
 * Only present in the API response when BUN > 17.
 */
export interface StructuralFloor {
  /** Estimated eGFR reflecting kidney structural capacity (reported_egfr + suppression_points) */
  structural_floor_egfr: number;
  /** eGFR points attributable to BUN workload suppression */
  suppression_points: number;
  /** BUN ratio used in the calculation (conservative of BUN-bracket and eGFR-bracket) */
  bun_ratio: number;
}

/**
 * Raw API response shape from POST /predict (v2.0 backend keys).
 * All keys are snake_case as returned by the FastAPI backend.
 */
export interface PredictResponse {
  /** Starting eGFR computed via CKD-EPI 2021 */
  egfr_baseline: number;
  /** Confidence tier: 1 = required fields only, 2 = with hemoglobin+glucose. Optional per backend contract. */
  confidence_tier?: 1 | 2;
  /** Fixed 15-value array: [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120] */
  time_points_months: number[];
  trajectories: {
    no_treatment: number[];
    bun_18_24: number[];
    bun_13_17: number[];
    bun_12: number[];
  };
  /**
   * Estimated patient age (years) when eGFR drops below dialysis_threshold per trajectory.
   * null if threshold not crossed within 120 months.
   */
  dial_ages: {
    no_treatment: number | null;
    bun_18_24: number | null;
    bun_13_17: number | null;
    bun_12: number | null;
  };
  /** eGFR threshold that triggers dialysis assessment (currently 12.0) */
  dialysis_threshold: number;
  /** eGFR points currently suppressed by elevated BUN */
  bun_suppression_estimate: number;
  /**
   * Amendment 3 BUN structural floor — only present when BUN > 17.
   * Display-only; not part of the trajectory engine.
   */
  structural_floor?: StructuralFloor;
}

// Tooltip state
export interface TooltipData {
  trajectoryId: TrajectoryId;
  label: string;
  color: string;
  egfr: number;
  months: number;
}
