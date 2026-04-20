/**
 * LKID-63 — /internal/chart/[token] server component.
 *
 * Playwright render target for the backend PDF pipeline. Validates the
 * shared `?secret=` query param against the server-only `PDF_SECRET`
 * env var, fetches the prediction from the FastAPI backend, and hands
 * the data to a client wrapper that renders the chart.
 *
 * This page must remain a server component — `PDF_SECRET` is not
 * exposed as NEXT_PUBLIC and must never land in client bundles.
 *
 * There is no navigation chrome. A nested route layout clears away the
 * SkipNav from the root layout so the PDF render is chart-only.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClientChart from "./ClientChart";
import type { PredictResponse } from "@/components/chart";

export const dynamic = "force-dynamic";

/**
 * LKID-73 — Internal PDF render target must never be indexed. Belt-and-braces
 * alongside the `/internal/` disallow in `app/robots.ts`.
 */
export const metadata: Metadata = {
  title: "Internal chart render",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

interface ResultsApiResponse {
  report_token: string;
  captured: boolean;
  created_at: string;
  result: PredictResponse;
  inputs?: { bun?: number } | null;
}

async function fetchResult(token: string): Promise<ResultsApiResponse | null> {
  const base =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";
  try {
    const res = await fetch(`${base}/results/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ResultsApiResponse;
  } catch {
    return null;
  }
}

export default async function InternalChartPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ secret?: string }>;
}) {
  const { token } = await params;
  const { secret } = await searchParams;

  const expected = process.env.PDF_SECRET;
  if (!expected || secret !== expected) {
    notFound();
  }

  const data = await fetchResult(token);
  if (!data) {
    notFound();
  }

  // Input BUN is needed to decide whether to show the structural-floor
  // callout. Backend persists inputs in predictions.inputs; /results/[token]
  // does not currently return them but the field is forward-compatible.
  const bun =
    typeof data.inputs?.bun === "number" ? data.inputs.bun : null;

  return <ClientChart result={data.result} bun={bun} />;
}
