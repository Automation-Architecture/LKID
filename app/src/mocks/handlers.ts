import { http, HttpResponse } from "msw";

// LKID-63 — MSW handlers for the tokenized flow.
//
// Patterns use wildcard prefixes so the handler matches both the legacy
// relative "/api/predict" used by the old page AND the absolute
// "${NEXT_PUBLIC_API_URL}/predict" the new pages issue against the
// FastAPI backend origin. See note below about module-level state.

const TIME_POINTS_MONTHS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120];

const MOCK_RESULT = {
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
  bun_suppression_estimate: 7.8,
};

const MOCK_TOKEN = "mock-token-abc123-xyz7890-yeet-1111-2222-3333-4444";
const MOCK_INPUTS = { bun: 35, creatinine: 2.1, potassium: 4.5, age: 58, sex: "unknown" };

// Module-level state tracks whether the mock user has completed the gate.
// Reset by invoking /predict again (starts a fresh prediction).
let mockCaptured = false;

export const handlers = [
  // Legacy relative path (predict page uses /api/predict). Kept for parity.
  http.post("*/api/predict", async () => {
    await new Promise((r) => setTimeout(r, 600));
    return HttpResponse.json(MOCK_RESULT);
  }),

  // POST /predict — new tokenized flow
  http.post("*/predict", async () => {
    await new Promise((r) => setTimeout(r, 600));
    mockCaptured = false;
    return HttpResponse.json({ report_token: MOCK_TOKEN, ...MOCK_RESULT });
  }),

  // GET /results/[token]
  http.get("*/results/:token", ({ params }) => {
    // In dev, any token returns the mock. E2E tests can pass MOCK_TOKEN
    // explicitly via the URL and this handler will answer.
    return HttpResponse.json({
      report_token: params.token,
      captured: mockCaptured,
      created_at: new Date().toISOString(),
      result: MOCK_RESULT,
      inputs: MOCK_INPUTS,
      lead: mockCaptured
        ? { name: "Mock User", email_captured_at: new Date().toISOString() }
        : null,
    });
  }),

  // POST /leads — flip captured -> true
  http.post("*/leads", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as
      | { report_token?: string; name?: string; email?: string }
      | null;
    if (!body?.report_token || !body.name || !body.email) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required fields",
            details: [{ message: "report_token, name, and email are all required" }],
          },
        },
        { status: 422 }
      );
    }
    mockCaptured = true;
    return HttpResponse.json({ ok: true, captured: true, token: body.report_token });
  }),

  // GET /reports/[token]/pdf — tiny stub body so the test doesn't need a real PDF.
  http.get("*/reports/:token/pdf", () => {
    // 4-byte "%PDF" magic only; enough to satisfy content-type sniffers.
    return new HttpResponse(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="kidney-health-report.pdf"',
      },
    });
  }),
];

/** Test-only helper: reset the captured flag before each test. */
export function resetMockGateState() {
  mockCaptured = false;
}
