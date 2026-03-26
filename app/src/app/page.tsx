import Link from "next/link";
import { Header } from "@/components/header";
import { DisclaimerBlock } from "@/components/disclaimer-block";

export default function LandingPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex flex-1 flex-col">
        {/* Mobile: stacked single-column layout */}
        <div className="mx-auto w-full max-w-[960px] px-4 pb-16 md:px-6 lg:px-8">
          {/* Mobile layout */}
          <div className="mt-8 md:hidden">
            <h1 className="text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-foreground">
              Understand Your Kidney Health Trajectory
            </h1>
            <p className="mt-4 text-base leading-6 text-foreground">
              Enter your lab values to see how your kidney health may change over
              the next 10 years.
            </p>
            <Link
              href="/auth"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>

          {/* Tablet + Desktop: side-by-side layout */}
          <div className="mt-8 hidden gap-8 md:grid md:grid-cols-2 md:items-center">
            {/* Hero illustration placeholder */}
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-[#F8F9FA] md:h-[180px] md:w-[240px] lg:h-[300px] lg:w-[400px]">
              <span className="text-sm text-muted-foreground">
                Hero Illustration
              </span>
            </div>

            {/* Copy + CTA */}
            <div>
              <h1 className="text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-foreground">
                Understand Your Kidney Health Trajectory
              </h1>
              <p className="mt-4 text-base leading-6 text-foreground">
                Enter your lab values to see how your kidney health may change
                over the next 10 years.
              </p>
              <Link
                href="/auth"
                className="mt-6 inline-flex h-12 min-w-[200px] items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </main>
      <DisclaimerBlock />
    </>
  );
}
