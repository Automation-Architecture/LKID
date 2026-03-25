import { http, HttpResponse } from "msw";

/** Generate a synthetic eGFR trajectory array (15 points, months 0-120). */
function trajectory(start: number, end: number): number[] {
  const points = 15;
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    return Math.round(start + (end - start) * t);
  });
}

const months = Array.from({ length: 15 }, (_, i) => Math.round((i * 120) / 14));

export const handlers = [
  http.post("/predict", () => {
    return HttpResponse.json({
      egfr_calculated: 72,
      trajectories: [
        { label: "BUN <= 12", values: trajectory(72, 55) },
        { label: "BUN 13-17", values: trajectory(72, 42) },
        { label: "BUN 18-24", values: trajectory(72, 28) },
        { label: "No Treatment", values: trajectory(72, 12) },
      ],
      months,
      dial_ages: [null, null, 108, 84],
    });
  }),
];
