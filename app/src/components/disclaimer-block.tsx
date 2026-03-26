"use client";

import { useState, useId } from "react";

export function DisclaimerBlock() {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  const fullText =
    "This tool provides educational predictions only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your healthcare provider about your kidney health. Results are based on statistical models and individual outcomes may vary.";

  return (
    <>
      {/* Mobile: sticky collapsed bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden" role="region" aria-label="Medical disclaimer">
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={contentId}
          className="flex min-h-[44px] w-full items-center justify-between bg-[#F8F9FA] px-4 py-2 text-sm text-muted-foreground shadow-[0_-2px_8px_rgba(0,0,0,0.08)]"
        >
          <span className={expanded ? "" : "line-clamp-1"}>
            {expanded ? "" : "Medical disclaimer..."}
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
        <div id={contentId} className={expanded ? "bg-[#F8F9FA] px-4 pb-2 text-sm text-muted-foreground" : "hidden"}>
          {fullText}
        </div>
      </div>

      {/* Tablet/Desktop: inline footer */}
      <footer className="mt-8 hidden border-t border-border px-4 py-4 md:block md:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">{fullText}</p>
        <div className="mt-2 flex gap-4 text-sm">
          <button onClick={(e) => e.preventDefault()} className="text-muted-foreground underline hover:text-foreground">
            About
          </button>
          <button onClick={(e) => e.preventDefault()} className="text-muted-foreground underline hover:text-foreground">
            Privacy
          </button>
          <button onClick={(e) => e.preventDefault()} className="text-muted-foreground underline hover:text-foreground">
            Terms
          </button>
        </div>
      </footer>
    </>
  );
}
