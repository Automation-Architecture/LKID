/**
 * LKID-63 / LKID-82 — /internal/chart/[token] server component.
 *
 * Playwright render target for the backend PDF pipeline. Validates the
 * shared `?secret=` query param against the server-only `PDF_SECRET`
 * env var, fetches the prediction from the FastAPI backend, and hands
 * the data to a client-rendered PdfReport that matches
 * project/PDF Report.html.
 *
 * This page must remain a server component — `PDF_SECRET` is not
 * exposed as NEXT_PUBLIC and must never land in client bundles.
 *
 * There is no navigation chrome. A nested route layout clears away the
 * SkipNav from the root layout so the PDF render is chrome-free.
 *
 * Playwright waits for `#pdf-ready` before invoking `page.pdf()` — that
 * id lives on the outer wrapper of `PdfReport`.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PdfReport from "@/components/results/PdfReport";
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
  lead?: { name?: string; email_captured_at?: string | null } | null;
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

  // Input BUN is needed to decide whether to show the structural-floor copy
  // in the explanation block. Backend persists inputs in predictions.inputs.
  const bun = typeof data.inputs?.bun === "number" ? data.inputs.bun : null;

  // Lead name is returned by /results/{token} when captured=true (backend
  // main.py lines 619-645). Fall back to an empty string for the rare
  // pre-capture path — the PdfReport hides the name row when blank.
  const patientName = data.lead?.name ?? "";

  return (
    <PdfReport
      result={data.result}
      patientName={patientName}
      createdAt={data.created_at}
      bun={bun}
    />
  );
}
