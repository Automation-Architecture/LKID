/**
 * k6 Load Test — POST /lab-entries (LKID-50)
 *
 * Ramps to 50 concurrent VUs, measures throughput and error rate.
 * Asserts p95 < 2s and error rate < 1%.
 *
 * Usage:
 *   k6 run backend/tests/load/lab_entries_load.js
 *   API_BASE_URL=https://api.kidneyhood.org k6 run backend/tests/load/lab_entries_load.js
 *
 * Prerequisites:
 *   Generate test data first:
 *   python backend/tests/load/generate_test_data.py --count 500 --output backend/tests/load/test_data.json
 *
 * Note: POST /lab-entries is not yet implemented in the API scaffold.
 * This script is ready for when the endpoint is built (Sprint 3).
 * Until then, expect 404 or 501 responses — useful for verifying
 * infrastructure can handle the request volume regardless.
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
const labEntryLatency = new Trend("lab_entry_latency", true);
const labEntryErrors = new Rate("lab_entry_errors");
const labEntryThroughput = new Rate("lab_entry_throughput");

// Load test data via SharedArray (memory-efficient across VUs)
const testData = new SharedArray("lab_entry_payloads", function () {
  const data = JSON.parse(open("./test_data.json"));
  return data.lab_entry_payloads;
});

// ---------------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------------

export const options = {
  stages: [
    // Ramp-up: 0 -> 50 VUs over 30 seconds
    { duration: "30s", target: 50 },
    // Steady state: hold at 50 VUs for 60 seconds
    { duration: "60s", target: 50 },
    // Ramp-down: 50 -> 0 VUs over 15 seconds
    { duration: "15s", target: 0 },
  ],
  thresholds: {
    // p95 response time must be under 2 seconds
    lab_entry_latency: ["p(95)<2000"],
    // Error rate must be under 1%
    lab_entry_errors: ["rate<0.01"],
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
    tags: { name: "POST /lab-entries" },
  };

  const res = http.post(
    `${BASE_URL}/lab-entries`,
    JSON.stringify(payload),
    params
  );

  // Record custom metrics
  labEntryLatency.add(res.timings.duration);
  labEntryErrors.add(res.status !== 200 && res.status !== 201);
  labEntryThroughput.add(res.status === 200 || res.status === 201);

  // Assertions
  check(res, {
    "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
    "response time < 2s": (r) => r.timings.duration < 2000,
    "response body is valid JSON": (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  // Small pause between requests
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
