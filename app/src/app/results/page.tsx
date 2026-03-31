"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { DisclaimerBlock } from "@/components/disclaimer-block";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { EgfrChart, transformPredictResponse } from "@/components/chart";
import type { ChartData, PredictResponse } from "@/components/chart";

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

interface ResultsContentProps {
  chartData: ChartData;
}

function ResultsContent({ chartData }: ResultsContentProps) {
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
      setChartData(transformPredictResponse(parsed));
    } catch {
      setParseError(true);
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
          {loading || !chartData ? (
            <LoadingSkeleton />
          ) : (
            <ResultsContent chartData={chartData} />
          )}
        </div>
      </main>
      <DisclaimerBlock />
    </>
  );
}
