import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px] text-center space-y-6">
        <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">
          KidneyHood
        </h1>
        <p className="text-lg text-muted-foreground">
          Understand your kidney health trajectory
        </p>
        <Link
          href="/auth"
          className="inline-flex h-14 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors hover:opacity-90"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
