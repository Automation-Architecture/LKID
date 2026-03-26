"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { DisclaimerBlock } from "@/components/disclaimer-block";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

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

function ResultsContent() {
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

      {/* Chart placeholder */}
      <section
        aria-label="Your kidney health prediction"
        className="flex h-[200px] items-center justify-center rounded-lg border border-border bg-[#F8F9FA] md:h-[280px] lg:h-[340px]"
      >
        <p className="text-base font-semibold text-muted-foreground">
          <span className="md:hidden">Chart: 4 trajectories, 100% x 200px</span>
          <span className="hidden md:inline lg:hidden">Chart: 4 trajectories, 100% x 280px</span>
          <span className="hidden lg:inline">Chart: 4 trajectories, ~896px x 340px</span>
        </p>
      </section>

      <p className="text-xs italic text-[#888888]">
        Data points are plotted at actual time intervals. Early measurements are
        more frequent.
      </p>

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

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center px-4 pb-16 md:px-6 lg:px-8">
        <div className="mt-6 w-full max-w-[960px] md:mt-8">
          {loading ? <LoadingSkeleton /> : <ResultsContent />}
        </div>
      </main>
      <DisclaimerBlock />
    </>
  );
}
