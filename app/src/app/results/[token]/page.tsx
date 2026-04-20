"use client";

/**
 * LKID-63 — /results/[token] — Results view (no auth, tokenized).
 *
 * On mount GETs /results/[token]:
 *   • 404/410 → "invalid or expired" card.
 *   • 200 + captured=false → router.replace to /gate/[token] (force the
 *     user through the email gate — direct access attempts fall back to
 *     the gate).
 *   • 200 + captured=true → render chart + structural-floor callout and
 *     show the PDF download button pointing at /reports/[token]/pdf.
 *
 * NOTE: this page lives at /results/[token]. The legacy session-storage
 * page at /results/page.tsx is untouched and handled by LKID-66.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Header } from "@/components/header";
import { DisclaimerBlock } from "@/components/disclaimer-block";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import {
  EgfrChart,
  transformPredictResponse,
  type ChartData,
  type PredictResponse,
  type StructuralFloor,
} from "@/components/chart";
import { API_BASE, apiUrl } from "@/lib/api";
import { posthog } from "@/lib/posthog-provider";

/**
 * LKID-71 bun_tier derivation — mirrors `backend/services/klaviyo_service.py::_bun_tier`.
 * Kept in sync so PostHog funnel properties align with Klaviyo segmentation.
 * Non-PII: a 4-bucket label, never the raw value.
 */
function bunTier(bun: number | null): string {
  if (bun === null || !Number.isFinite(bun)) return "unknown";
  if (bun <= 12) return "<=12";
  if (bun <= 17) return "13-17";
  if (bun <= 24) return "18-24";
  return ">24";
}

/**
 * LKID-71 CKD stage bucketing — KDIGO boundaries.
 * Emits a stage label (e.g. "stage_3a") instead of the raw eGFR number so
 * PostHog never receives a lab value. Keep in sync with the provider docstring.
 */
function ckdStage(egfr: number | null | undefined): string {
  if (egfr === null || egfr === undefined || !Number.isFinite(egfr)) return "unknown";
  if (egfr >= 90) return "stage_1";
  if (egfr >= 60) return "stage_2";
  if (egfr >= 45) return "stage_3a";
  if (egfr >= 30) return "stage_3b";
  if (egfr >= 15) return "stage_4";
  return "stage_5";
}

interface ResultsApiResponse {
  report_token: string;
  captured: boolean;
  created_at: string;
  result: PredictResponse;
  inputs?: { bun?: number } | null;
  lead?: { name?: string; email_captured_at?: string | null } | null;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; data: ResultsApiResponse; chart: ChartData }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

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
    <aside
      aria-label="BUN structural floor estimate"
      className="rounded-lg border border-[#004D43]/20 bg-[#004D43]/5 px-4 py-3"
      data-testid="structural-floor-callout"
    >
      <p className="text-sm leading-relaxed text-foreground">
        Your reported eGFR is{" "}
        <strong className="font-semibold">{reportedEgfr}</strong>. At your current BUN of{" "}
        <strong className="font-semibold">{bunValue}</strong>, approximately{" "}
        <strong className="font-semibold">{suppressionPoints}</strong>{" "}
        {suppressionPoints === 1 ? "point" : "points"} of that reading reflect BUN workload
        suppression, not permanent damage. Your estimated structural capacity is eGFR{" "}
        <strong className="font-semibold">{structuralEgfr}</strong>.
      </p>
    </aside>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Your Prediction</h1>
        <p className="mt-2 text-base text-muted-foreground">Loading your results…</p>
      </div>
      <div className="h-[200px] animate-pulse rounded-lg bg-[#F8F9FA] md:h-[280px] lg:h-[340px]" />
      <div className="h-14 animate-pulse rounded-lg bg-[#F8F9FA]" />
    </div>
  );
}

export default function ResultsTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { token } = use(params);

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  // Input BUN for structural-floor callout is not returned from the backend
  // response directly; the engine result carries its own structural_floor.
  // We still surface the BUN value the user typed by pulling it off the
  // inputs dict the backend persists. GET /results/[token] returns `result`
  // (PredictResponse). The inputs we need for the callout are not in that
  // payload — so we reach into the structural_floor object itself to decide
  // whether to render the callout. The callout copy mentions "your current
  // BUN" — without the original BUN we show the raw suppression points
  // callout without that number. To preserve parity with the legacy page,
  // we still need BUN; fetch it from the extended response if available.
  const [inputBun, setInputBun] = useState<number | null>(null);

  // LKID-71: fire `results_viewed` exactly once per successful mount.
  // Non-PII props only: prefix + bucketed stage + tier. No raw lab values,
  // no token, no email.
  useEffect(() => {
    if (state.kind !== "ready") return;
    posthog.capture("results_viewed", {
      report_token_prefix: token.slice(0, 8),
      ckd_stage: ckdStage(state.data.result.egfr_baseline),
      bun_tier: bunTier(inputBun),
    });
    // Only want to fire once on transition to "ready". The subsequent
    // `inputBun` state update is bundled into the same `ready` render, so
    // we intentionally omit inputBun from deps to avoid a double fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, token]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(apiUrl(`/results/${encodeURIComponent(token)}`), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;

        if (res.status === 404 || res.status === 410) {
          setState({ kind: "invalid" });
          return;
        }
        if (!res.ok) {
          setState({
            kind: "error",
            message: "Something went wrong loading your report. Please try again.",
          });
          return;
        }

        const data = (await res.json()) as ResultsApiResponse;
        if (!data.captured) {
          router.replace(`/gate/${encodeURIComponent(token)}`);
          return;
        }
        setInputBun(
          typeof data.inputs?.bun === "number" ? data.inputs.bun : null,
        );
        setState({
          kind: "ready",
          data,
          chart: transformPredictResponse(data.result),
        });
      } catch {
        if (cancelled) return;
        setState({
          kind: "error",
          message: "Unable to reach the prediction service. Please try again.",
        });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (state.kind === "invalid") {
    return (
      <>
        <Header />
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center px-4 pb-16 md:px-6 lg:px-8"
        >
          <div className="mt-12 w-full max-w-[520px] rounded-lg border border-border bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-foreground" role="alert">
              This report link is invalid or has expired
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              We couldn&apos;t find your report. Please re-enter your lab values to get a fresh
              prediction.
            </p>
            <Link
              href="/labs"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#1F2577] px-8 text-base font-semibold text-white hover:bg-[#161B5E]"
            >
              Start a new check
            </Link>
          </div>
        </main>
        <DisclaimerBlock />
      </>
    );
  }

  if (state.kind === "error") {
    return (
      <>
        <Header />
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center px-4 pb-16 md:px-6 lg:px-8"
        >
          <div className="mt-12 w-full max-w-[520px] rounded-lg border border-border bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-foreground" role="alert">
              Something went wrong
            </h1>
            <p className="mt-3 text-base text-muted-foreground">{state.message}</p>
            <Link
              href="/labs"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#1F2577] px-8 text-base font-semibold text-white hover:bg-[#161B5E]"
            >
              Start a new check
            </Link>
          </div>
        </main>
        <DisclaimerBlock />
      </>
    );
  }

  const pdfHref = `${API_BASE}/reports/${encodeURIComponent(token)}/pdf`;

  return (
    <>
      <Header />
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center px-4 pb-16 md:px-6 lg:px-8"
      >
        <div className="mt-6 w-full max-w-[960px] md:mt-8">
          {state.kind === "loading" ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-foreground" data-testid="results-heading">
                  Your Prediction
                </h1>
                <p className="mt-2 text-base text-foreground">
                  Here is how your kidney function may change over the next 10 years under four
                  scenarios.
                </p>
              </div>

              <section aria-label="Your kidney health prediction">
                <EgfrChart data={state.chart} />
              </section>

              {state.data.result.structural_floor &&
                state.data.result.structural_floor.suppression_points >= 0.5 &&
                inputBun !== null && (
                  <StructuralFloorCallout
                    egfrBaseline={state.data.result.egfr_baseline}
                    bun={inputBun}
                    floor={state.data.result.structural_floor}
                  />
                )}

              <a
                href={pdfHref}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="results-pdf-link"
                className="inline-block"
                onClick={() => {
                  // LKID-71: funnel tail. Prefix-only, never the full token.
                  posthog.capture("pdf_downloaded", {
                    report_token_prefix: token.slice(0, 8),
                  });
                }}
              >
                <Button
                  type="button"
                  className="h-14 w-full rounded-lg text-base font-semibold md:w-auto md:min-w-[320px]"
                >
                  <FileDown className="mr-2 size-5" />
                  Download Your Results (PDF)
                </Button>
              </a>

              <div className="pt-2">
                <Link
                  href="/labs"
                  className="text-sm text-secondary underline hover:text-secondary/80"
                  data-testid="results-edit-link"
                >
                  &larr; Edit info
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <DisclaimerBlock />
    </>
  );
}
