import Link from "next/link";

export default function ResultsPage() {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8">
      <div className="w-full max-w-[960px] space-y-6">
        <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">
          Your eGFR Trajectory
        </h1>
        <div className="flex h-[400px] items-center justify-center rounded-lg border border-border bg-card">
          <p className="text-sm text-muted-foreground">
            Chart placeholder (Visx)
          </p>
        </div>
        <div className="flex gap-4">
          <button
            className="inline-flex h-14 items-center justify-center rounded-lg border border-border px-8 text-base font-semibold transition-colors hover:bg-accent"
            disabled
          >
            Download PDF
          </button>
          <Link
            href="/"
            className="inline-flex h-14 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors hover:opacity-90"
          >
            Start Over
          </Link>
        </div>
      </div>
    </main>
  );
}
