"use client";

/**
 * LKID-63 — /internal/chart/[token] client wrapper.
 *
 * Receives already-validated, already-fetched prediction data from the
 * parent server component. Renders the visx-based EgfrChart plus the
 * structural-floor callout. No navigation chrome, no interactivity.
 *
 * Playwright waits for `#pdf-ready` before invoking page.pdf() so we
 * mark the outer container with that id.
 */

import {
  EgfrChart,
  transformPredictResponse,
  type PredictResponse,
  type StructuralFloor,
} from "@/components/chart";
import { useMemo } from "react";

interface Props {
  result: PredictResponse;
  bun: number | null;
}

function StructuralFloorCallout({
  egfrBaseline,
  bun,
  floor,
}: {
  egfrBaseline: number;
  bun: number;
  floor: StructuralFloor;
}) {
  const reportedEgfr = Math.round(egfrBaseline);
  const suppressionPoints = Math.round(floor.suppression_points);
  const structuralEgfr = Math.round(floor.structural_floor_egfr);
  const bunValue = Math.round(bun);
  return (
    <div
      style={{
        border: "1px solid rgba(0, 77, 67, 0.2)",
        backgroundColor: "rgba(0, 77, 67, 0.05)",
        borderRadius: 8,
        padding: "12px 16px",
        marginTop: 16,
      }}
    >
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: "#1a1a1a" }}>
        Your reported eGFR is <strong>{reportedEgfr}</strong>. At your current BUN of{" "}
        <strong>{bunValue}</strong>, approximately <strong>{suppressionPoints}</strong>{" "}
        {suppressionPoints === 1 ? "point" : "points"} of that reading reflect BUN workload
        suppression, not permanent damage. Your estimated structural capacity is eGFR{" "}
        <strong>{structuralEgfr}</strong>.
      </p>
    </div>
  );
}

export default function ClientChart({ result, bun }: Props) {
  const chartData = useMemo(() => transformPredictResponse(result), [result]);
  const showFloor =
    result.structural_floor &&
    result.structural_floor.suppression_points >= 0.5 &&
    bun !== null;

  return (
    <div
      id="pdf-ready"
      style={{
        width: 960,
        margin: "0 auto",
        padding: "32px 40px 40px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: "#fff",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#004D43", margin: "0 0 4px" }}>
          KidneyHood
        </h1>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", margin: "0 0 6px" }}>
          Your eGFR Prediction
        </h2>
        <p style={{ fontSize: 14, color: "#666", margin: 0 }}>
          Projected kidney function over the next 10 years under four scenarios.
        </p>
      </div>

      <div style={{ width: "100%" }}>
        <EgfrChart data={chartData} />
      </div>

      {showFloor && result.structural_floor && bun !== null && (
        <StructuralFloorCallout
          egfrBaseline={result.egfr_baseline}
          bun={bun}
          floor={result.structural_floor}
        />
      )}

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e5e5e5" }}>
        <p style={{ fontSize: 11, color: "#888", lineHeight: 1.5, margin: 0 }}>
          This tool is for informational purposes only and does not constitute medical advice.
          Consult your healthcare provider before making any decisions about your kidney health.
          Results are based on population-level models and may not reflect your individual
          clinical trajectory.
        </p>
      </div>
    </div>
  );
}
