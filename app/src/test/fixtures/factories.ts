/**
 * Factory functions for KidneyHood frontend test fixtures.
 *
 * All shapes match the actual API response types from main.py (LKID-15).
 * Use overrides to customize any field for specific test scenarios.
 *
 * LKID-56 — Shared Test Fixture Library
 */

// ---------------------------------------------------------------------------
// Types (matching API contract + LKID-15 enhanced schemas)
// ---------------------------------------------------------------------------

export interface PredictRequest {
  bun: number;
  creatinine: number;
  potassium: number;
  age: number;
  sex: "male" | "female" | "unknown";
  hemoglobin?: number | null;
  glucose?: number | null;
  name?: string | null;
  email?: string | null;
}

export interface Trajectories {
  no_treatment: number[];
  bun_18_24: number[];
  bun_13_17: number[];
  bun_12: number[];
}

export interface DialAges {
  no_treatment: number | null;
  bun_18_24: number | null;
  bun_13_17: number | null;
  bun_12: number | null;
}

export interface PredictResponse {
  egfr_baseline: number;
  confidence_tier: number;
  trajectories: Trajectories;
  time_points_months: number[];
  dial_ages: DialAges;
  dialysis_threshold: number;
  stat_cards: Record<string, number>;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  bun: number;
  creatinine: number;
  age: number;
  created_at: string;
}

export interface HealthResponse {
  status: "ok";
  version: string;
}

export interface ErrorDetail {
  field?: string;
  message: string;
}

export interface ErrorResponse {
  error: {
    code: "VALIDATION_ERROR" | "AUTH_ERROR" | "RATE_LIMIT" | "INTERNAL_ERROR";
    message: string;
    details?: ErrorDetail[];
  };
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_TIME_POINTS = [
  0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120,
];

// Sample trajectories from api_contract.json example (BUN=35, Cr=2.1, age=58)
const DEFAULT_TRAJECTORIES: Trajectories = {
  no_treatment: [
    33.0, 32.8, 32.3, 31.7, 30.6, 29.5, 28.4, 26.3, 24.1, 22.0, 19.8, 17.7,
    15.5, 13.4, 11.2,
  ],
  bun_18_24: [
    33.0, 34.0, 35.7, 36.0, 37.0, 37.6, 37.9, 36.4, 34.9, 33.4, 31.9, 30.4,
    28.9, 27.4, 25.9,
  ],
  bun_13_17: [
    33.0, 34.6, 36.9, 37.4, 39.4, 40.7, 41.4, 40.4, 39.4, 38.4, 37.4, 36.4,
    35.4, 34.4, 33.4,
  ],
  bun_12: [
    33.0, 35.4, 38.7, 39.6, 42.6, 44.5, 45.7, 45.2, 44.7, 44.2, 43.7, 43.2,
    42.7, 42.2, 41.7,
  ],
};

const DEFAULT_DIAL_AGES: DialAges = {
  no_treatment: 68.2,
  bun_18_24: null,
  bun_13_17: null,
  bun_12: null,
};

const DEFAULT_STAT_CARDS: Record<string, number> = {
  bun_suppression_estimate: 7.8,
  egfr_baseline: 33.0,
};

// ---------------------------------------------------------------------------
// Factory: PredictRequest
// ---------------------------------------------------------------------------

export function makePredictRequest(
  overrides?: Partial<PredictRequest>
): PredictRequest {
  return {
    bun: 35,
    creatinine: 2.1,
    potassium: 4.5,
    age: 58,
    sex: "male",
    hemoglobin: null,
    glucose: null,
    name: "Test Patient",
    email: "testpatient@example.com",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Factory: PredictResponse
// ---------------------------------------------------------------------------

export function makePredictResponse(
  overrides?: Partial<PredictResponse>
): PredictResponse {
  return {
    egfr_baseline: 33.0,
    confidence_tier: 1,
    time_points_months: [...DEFAULT_TIME_POINTS],
    trajectories: { ...DEFAULT_TRAJECTORIES },
    dial_ages: { ...DEFAULT_DIAL_AGES },
    dialysis_threshold: 12.0,
    stat_cards: { ...DEFAULT_STAT_CARDS },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Factory: Lead
// ---------------------------------------------------------------------------

let leadIdCounter = 1;

export function makeLead(overrides?: Partial<Lead>): Lead {
  return {
    id: leadIdCounter++,
    name: "Test Patient",
    email: "testpatient@example.com",
    bun: 35,
    creatinine: 2.1,
    age: 58,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Reset the auto-incrementing lead ID counter (call in beforeEach). */
export function resetLeadIdCounter(): void {
  leadIdCounter = 1;
}

// ---------------------------------------------------------------------------
// Factory: HealthResponse
// ---------------------------------------------------------------------------

export function makeHealthResponse(
  overrides?: Partial<HealthResponse>
): HealthResponse {
  return {
    status: "ok",
    version: "2.0.0",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Factory: ErrorResponse
// ---------------------------------------------------------------------------

export function makeErrorResponse(
  overrides?: Partial<ErrorResponse["error"]>
): ErrorResponse {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// Boundary helpers
// ---------------------------------------------------------------------------

/** PredictRequest at minimum valid boundaries (binding validation table). */
export function makePredictRequestAtMin(): PredictRequest {
  return makePredictRequest({
    bun: 5,
    creatinine: 0.3,
    potassium: 2.0,
    age: 18,
    sex: "unknown",
  });
}

/** PredictRequest at maximum valid boundaries (binding validation table). */
export function makePredictRequestAtMax(): PredictRequest {
  return makePredictRequest({
    bun: 150,
    creatinine: 20.0,
    potassium: 8.0,
    age: 120,
    sex: "female",
    hemoglobin: 20.0,
    glucose: 500,
  });
}

/** PredictRequest with one invalid field for negative testing. */
export function makePredictRequestInvalid(
  field: keyof PredictRequest,
  value: unknown
): PredictRequest {
  return makePredictRequest({ [field]: value } as Partial<PredictRequest>);
}

// ---------------------------------------------------------------------------
// Tier helpers
// ---------------------------------------------------------------------------

/** Tier 1 request -- required fields only (bun, creatinine, potassium, age, sex). */
export function makeTier1Request(
  overrides?: Partial<PredictRequest>
): PredictRequest {
  return makePredictRequest({
    hemoglobin: null,
    glucose: null,
    ...overrides,
  });
}

/**
 * Tier 2 request -- Tier 1 + hemoglobin AND glucose (both present).
 * Per Decision #12, both must be provided for Tier 2 confidence.
 */
export function makeTier2Request(
  overrides?: Partial<PredictRequest>
): PredictRequest {
  return makePredictRequest({
    hemoglobin: 12.5,
    glucose: 100.0,
    ...overrides,
  });
}
