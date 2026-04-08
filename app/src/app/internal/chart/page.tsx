"use client";

/**
 * Internal chart page for Playwright PDF rendering.
 *
 * URL: /internal/chart?data={base64_json}&secret={shared_secret}
 *
 * This page is NOT publicly accessible — protected by a shared secret
 * query parameter. Playwright on the backend navigates here to render
 * the chart as pixel-perfect SVG, then calls page.pdf().
 */

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { EgfrChart, transformPredictResponse } from "@/components/chart";
import type { PredictResponse, StructuralFloor } from "@/components/chart";

const PDF_SECRET = process.env.NEXT_PUBLIC_PDF_SECRET || "dev-pdf-secret";

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
        Your reported eGFR is <strong>{reportedEgfr}</strong>. At your current
        BUN of <strong>{bunValue}</strong>, approximately{" "}
        <strong>{suppressionPoints}</strong>{" "}
        {suppressionPoints === 1 ? "point" : "points"} of that reading reflect
        BUN workload suppression, not permanent damage. Your estimated structural
        capacity is eGFR <strong>{structuralEgfr}</strong>.
      </p>
    </div>
  );
}

function ChartContent() {
  const searchParams = useSearchParams();

  const { chartData, response, bun, error } = useMemo(() => {
    const secret = searchParams.get("secret");
    if (secret !== PDF_SECRET) {
      return { chartData: null, response: null, bun: null, error: "Unauthorized" };
    }

    const dataParam = searchParams.get("data");
    if (!dataParam) {
      return { chartData: null, response: null, bun: null, error: "Missing data parameter" };
    }

    try {
      const json = atob(dataParam);
      const parsed = JSON.parse(json) as { result: PredictResponse; bun: number };
      const transformed = transformPredictResponse(parsed.result);
      return {
        chartData: transformed,
        response: parsed.result,
        bun: parsed.bun,
        error: null,
      };
    } catch {
      return { chartData: null, response: null, bun: null, error: "Invalid data" };
    }
  }, [searchParams]);

  if (error) {
    return <div style={{ padding: 40, color: "red" }}>{error}</div>;
  }

  if (!chartData || !response) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  const showFloor =
    response.structural_floor &&
    response.structural_floor.suppression_points >= 0.5 &&
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
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#004D43",
            margin: "0 0 4px",
          }}
        >
          KidneyHood
        </h1>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#1a1a1a",
            margin: "0 0 6px",
          }}
        >
          Your eGFR Prediction
        </h2>
        <p style={{ fontSize: 14, color: "#666", margin: 0 }}>
          Projected kidney function over the next 10 years under four scenarios.
        </p>
      </div>

      {/* Chart — fixed width container for consistent PDF output */}
      <div style={{ width: "100%" }}>
        <EgfrChart data={chartData} />
      </div>

      {/* Structural floor callout */}
      {showFloor && response.structural_floor && bun !== null && (
        <StructuralFloorCallout
          egfrBaseline={response.egfr_baseline}
          bun={bun}
          floor={response.structural_floor}
        />
      )}

      {/* Disclaimer */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid #e5e5e5",
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: "#888",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          This tool is for informational purposes only and does not constitute
          medical advice. Consult your healthcare provider before making any
          decisions about your kidney health. Results are based on population-level
          models and may not reflect your individual clinical trajectory.
        </p>
      </div>
    </div>
  );
}

export default function InternalChartPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}>
      <ChartContent />
    </Suspense>
  );
}
