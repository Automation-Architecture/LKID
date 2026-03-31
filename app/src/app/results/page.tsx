"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { DisclaimerBlock } from "@/components/disclaimer-block";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { EgfrChart, transformPredictResponse } from "@/components/chart";
import type { ChartData, PredictResponse, StructuralFloor } from "@/components/chart";

function LoadingSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Your Prediction
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Calculating your prediction...
        </p>
      </div>

      {/* Skeleton chart */}
      <div className="h-[200px] animate-pulse rounded-lg bg-[#F8F9FA] md:h-[280px] lg:h-[340px]" />

      {/* Skeleton button */}
      <div className="h-14 animate-pulse rounded-lg bg-[#F8F9FA]" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  StructuralFloorCallout                                                    */
/* -------------------------------------------------------------------------- */

interface StructuralFloorCalloutProps {
  egfrBaseline: number;
  bun: number;
  floor: StructuralFloor;
}

function StructuralFloorCallout({ egfrBaseline, bun, floor }: StructuralFloorCalloutProps) {
  const reportedEgfr = Math.round(egfrBaseline);
  const suppressionPoints = Math.round(floor.suppression_points);
  const structuralEgfr = Math.round(floor.structural_floor_egfr);
  const bunValue = Math.round(bun);

  return (
    <aside
      aria-label="BUN structural floor estimate"
      className="rounded-lg border border-[#004D43]/20 bg-[#004D43]/5 px-4 py-3"
      data-testid="structural-floor-callout"
    >
      <p className="text-sm leading-relaxed text-foreground">
        Your reported eGFR is{" "}
        <strong className="font-semibold">{reportedEgfr}</strong>. At your
        current BUN of{" "}
        <strong className="font-semibold">{bunValue}</strong>, approximately{" "}
        <strong className="font-semibold">{suppressionPoints}</strong>{" "}
        {suppressionPoints === 1 ? "point" : "points"} of that reading reflect
        BUN workload suppression, not permanent damage. Your estimated
        structural capacity is eGFR{" "}
        <strong className="font-semibold">{structuralEgfr}</strong>.
      </p>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/*  ResultsContent                                                            */
/* -------------------------------------------------------------------------- */

interface ResultsContentProps {
  chartData: ChartData;
  rawResponse: PredictResponse;
  inputBun: number | null;
}

function ResultsContent({ chartData, rawResponse, inputBun }: ResultsContentProps) {
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "done">("idle");

  const handlePdfClick = () => {
    setPdfState("loading");
    setTimeout(() => {
      setPdfState("done");
      setTimeout(() => {
        setPdfState("idle");
      }, 2000);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Your Prediction
        </h1>
        <p className="mt-2 text-base text-foreground">
          Here is how your kidney function may change over the next 10 years
          under four scenarios.
        </p>
      </div>

      {/* eGFR Trajectory Chart */}
      <section aria-label="Your kidney health prediction">
        <EgfrChart data={chartData} />
      </section>

      {/* Amendment 3: BUN Structural Floor callout — only when BUN > 17 */}
      {rawResponse.structural_floor && inputBun !== null && (
        <StructuralFloorCallout
          egfrBaseline={rawResponse.egfr_baseline}
          bun={inputBun}
          floor={rawResponse.structural_floor}
        />
      )}

      {/* PDF Download button */}
      <Button
        onClick={handlePdfClick}
        disabled={pdfState === "loading"}
        className="h-14 w-full rounded-lg text-base font-semibold md:w-auto md:min-w-[320px]"
      >
        {pdfState === "loading" ? (
          <span className="flex items-center gap-2">
            <svg
              className="size-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Preparing PDF...
          </span>
        ) : pdfState === "done" ? (
          "Download complete!"
        ) : (
          <>
            <FileDown className="mr-2 size-5" />
            Download Your Results (PDF)
          </>
        )}
      </Button>

      {/* Navigation */}
      <div className="pt-2">
        <Link
          href="/predict"
          className="text-sm text-secondary underline hover:text-secondary/80"
        >
          &larr; Back to form
        </Link>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(true);
  const [parseError, setParseError] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [rawResponse, setRawResponse] = useState<PredictResponse | null>(null);
  const [inputBun, setInputBun] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = sessionStorage.getItem("prediction_result");
    if (!raw) {
      setHasData(false);
      window.location.href = "/predict";
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PredictResponse;
      setRawResponse(parsed);
      setChartData(transformPredictResponse(parsed));
    } catch {
      setParseError(true);
    }

    // Read BUN input stored by the predict form for the structural floor callout.
    try {
      const inputsRaw = sessionStorage.getItem("prediction_inputs");
      if (inputsRaw) {
        const inputs = JSON.parse(inputsRaw) as { bun?: number };
        if (typeof inputs.bun === "number") {
          setInputBun(inputs.bun);
        }
      }
    } catch {
      // Non-critical — structural floor callout simply won't render without BUN.
    }

    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  if (!hasData) return null;

  if (parseError) {
    return (
      <>
        <Header />
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center px-4 pb-16 md:px-6 lg:px-8"
        >
          <div className="mt-6 w-full max-w-[960px] md:mt-8">
            <div role="alert" className="space-y-4">
              <h1 className="text-xl font-semibold text-foreground">
                Something went wrong
              </h1>
              <p className="text-base text-muted-foreground">
                We were unable to load your prediction results. Please return to
                the form and try again.
              </p>
              <Link
                href="/predict"
                className="text-sm text-secondary underline hover:text-secondary/80"
              >
                &larr; Back to form
              </Link>
            </div>
          </div>
        </main>
        <DisclaimerBlock />
      </>
    );
  }

  return (
    <>
      <Header />
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center px-4 pb-16 md:px-6 lg:px-8"
      >
        <div className="mt-6 w-full max-w-[960px] md:mt-8">
          {loading || !chartData || !rawResponse ? (
            <LoadingSkeleton />
          ) : (
            <ResultsContent
              chartData={chartData}
              rawResponse={rawResponse}
              inputBun={inputBun}
            />
          )}
        </div>
      </main>
      <DisclaimerBlock />
    </>
  );
}
