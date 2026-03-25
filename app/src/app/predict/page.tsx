import Link from "next/link";

export default function PredictPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-[640px] space-y-6">
        <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">
          Enter Your Lab Values
        </h1>
        <p className="text-base text-muted-foreground">
          Provide your kidney health lab results to generate a trajectory
          prediction.
        </p>
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Form fields placeholder (age, sex, serum creatinine, BUN, etc.)
        </div>
        <Link
          href="/results"
          className="inline-flex h-14 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors hover:opacity-90"
        >
          View Results
        </Link>
      </div>
    </main>
  );
}
