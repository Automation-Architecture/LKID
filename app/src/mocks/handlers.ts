import { http, HttpResponse } from "msw";

/**
 * Time points array from Lee's calc spec (Section 1).
 * 15 unevenly spaced values in months.
 */
const TIME_POINTS_MONTHS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120];

/**
 * Mock prediction response using Test Vector 1 from calc spec (Section 4):
 * BUN 35, eGFR 33, Age 58
 */
const MOCK_RESPONSE = {
  egfr_baseline: 33.0,
  confidence_tier: 1,
  trajectories: {
    no_treatment: [33.0, 32.8, 32.3, 31.7, 30.6, 29.5, 28.4, 26.3, 24.1, 22.0, 19.8, 17.7, 15.5, 13.4, 11.2],
    bun_18_24: [33.0, 34.0, 35.7, 36.0, 37.0, 37.6, 37.9, 36.4, 34.9, 33.4, 31.9, 30.4, 28.9, 27.4, 25.9],
    bun_13_17: [33.0, 34.6, 36.9, 37.4, 39.4, 40.7, 41.4, 40.4, 39.4, 38.4, 37.4, 36.4, 35.4, 34.4, 33.4],
    bun_12: [33.0, 35.4, 38.7, 39.6, 42.6, 44.5, 45.7, 45.2, 44.7, 44.2, 43.7, 43.2, 42.7, 42.2, 41.7],
  },
  time_points_months: TIME_POINTS_MONTHS,
  dial_ages: {
    no_treatment: 68.2,
    bun_18_24: null,
    bun_13_17: null,
    bun_12: null,
  },
  dialysis_threshold: 12.0,
  stat_cards: {
    egfr_baseline: 33.0,
    egfr_10yr_no_treatment: 11.2,
    egfr_10yr_best_case: 41.7,
    potential_gain_10yr: 30.5,
    bun_suppression_estimate: 7.8,
  },
};

export const handlers = [
  http.post("/api/predict", async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return HttpResponse.json(MOCK_RESPONSE);
  }),
];
