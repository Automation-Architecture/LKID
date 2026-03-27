/**
 * k6 Load Test — POST /predict (LKID-50)
 *
 * Ramps to 100 concurrent VUs, measures p50/p95/p99 latency.
 * Asserts p95 < 2s and error rate < 1%.
 *
 * Usage:
 *   k6 run backend/tests/load/predict_load.js
 *   API_BASE_URL=https://api.kidneyhood.org k6 run backend/tests/load/predict_load.js
 *
 * Prerequisites:
 *   Generate test data first:
 *   python backend/tests/load/generate_test_data.py --count 500 --output backend/tests/load/test_data.json
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Rate, Trend } from "k6/metrics";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.API_BASE_URL || "http://localhost:8000";

// Custom metrics
const predictLatency = new Trend("predict_latency", true);
const predictErrors = new Rate("predict_errors");

// Load test data via SharedArray (memory-efficient across VUs)
const testData = new SharedArray("predict_payloads", function () {
  const data = JSON.parse(open("./test_data.json"));
  return data.predict_payloads;
});

// ---------------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------------

export const options = {
  stages: [
    // Ramp-up: 0 -> 100 VUs over 30 seconds
    { duration: "30s", target: 100 },
    // Steady state: hold at 100 VUs for 60 seconds
    { duration: "60s", target: 100 },
    // Ramp-down: 100 -> 0 VUs over 15 seconds
    { duration: "15s", target: 0 },
  ],
  thresholds: {
    // p95 response time must be under 2 seconds
    predict_latency: ["p(95)<2000"],
    // Error rate must be under 1%
    predict_errors: ["rate<0.01"],
    // Built-in HTTP failure rate
    http_req_failed: ["rate<0.01"],
  },
};

// ---------------------------------------------------------------------------
// Test function — runs once per VU iteration
// ---------------------------------------------------------------------------

export default function () {
  // Each VU picks a unique payload based on its iteration count
  const index = (__VU * 1000 + __ITER) % testData.length;
  const payload = testData[index];

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
    tags: { name: "POST /predict" },
  };

  const res = http.post(
    `${BASE_URL}/predict`,
    JSON.stringify(payload),
    params
  );

  // Record custom metrics
  predictLatency.add(res.timings.duration);
  predictErrors.add(res.status !== 200);

  // Assertions
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response has egfr_baseline": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.egfr_baseline !== undefined;
      } catch {
        return false;
      }
    },
    "response has trajectories": (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          body.trajectories &&
          body.trajectories.no_treatment &&
          body.trajectories.bun_12
        );
      } catch {
        return false;
      }
    },
    "response time < 2s": (r) => r.timings.duration < 2000,
  });

  // Small pause between requests to avoid unrealistic burst patterns
  sleep(0.1 + Math.random() * 0.3);
}

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

export function setup() {
  // Verify the API is reachable before starting the load test
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health check passed": (r) => r.status === 200,
  });

  if (healthRes.status !== 200) {
    throw new Error(
      `API health check failed (${healthRes.status}). Is the server running at ${BASE_URL}?`
    );
  }

  console.log(`Load test starting against ${BASE_URL}`);
  console.log(`Test data: ${testData.length} unique payloads`);
}

export function teardown() {
  console.log("Load test complete. Review thresholds above.");
}
