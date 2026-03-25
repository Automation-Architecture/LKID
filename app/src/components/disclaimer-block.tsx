"use client";

import { useState } from "react";

export function DisclaimerBlock() {
  const [expanded, setExpanded] = useState(false);

  const fullText =
    "This tool provides educational predictions only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your healthcare provider about your kidney health. Results are based on statistical models and individual outcomes may vary.";

  return (
    <>
      {/* Mobile: sticky collapsed bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex min-h-[44px] w-full items-center justify-between bg-[#F8F9FA] px-4 py-2 text-sm text-muted-foreground shadow-[0_-2px_8px_rgba(0,0,0,0.08)]"
        >
          <span className={expanded ? "" : "line-clamp-1"}>
            {expanded ? fullText : "Medical disclaimer..."}
          </span>
          <svg
            className={`ml-2 size-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Tablet/Desktop: inline footer */}
      <footer className="mt-8 hidden border-t border-border px-4 py-4 md:block md:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">{fullText}</p>
        <div className="mt-2 flex gap-4 text-sm">
          <a href="#" className="text-muted-foreground underline hover:text-foreground">
            About
          </a>
          <a href="#" className="text-muted-foreground underline hover:text-foreground">
            Privacy
          </a>
          <a href="#" className="text-muted-foreground underline hover:text-foreground">
            Terms
          </a>
        </div>
      </footer>
    </>
  );
}
