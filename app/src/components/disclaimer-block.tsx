"use client";

/**
 * LKID-5 — Medical Disclaimers
 * Verbatim text per spec — DO NOT paraphrase, truncate, or reorder.
 *
 * Desktop (>768px): inline below chart, always visible, no expand/collapse.
 * Mobile (≤768px): sticky collapsed footer, summary line always visible,
 *   tap-to-expand shows full text in elevated panel above footer.
 */

import { useState, useId, useEffect, useRef } from "react";

const DISCLAIMER_FULL =
  "This tool is for informational purposes only and does not constitute medical advice. Consult your healthcare provider before making any decisions about your kidney health.";

const DISCLAIMER_SUMMARY = "This tool is for informational purposes only.";

export function DisclaimerBlock() {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [expanded]);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        toggleRef.current &&
        !toggleRef.current.contains(target)
      ) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/*  Mobile: sticky collapsed footer + expandable panel                 */}
      {/* ------------------------------------------------------------------- */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 md:hidden"
        data-testid="disclaimer-container"
      >
        {/* Expanded panel — appears above footer bar; always in DOM for valid aria-controls */}
        <div
          id={contentId}
          ref={panelRef}
          role="region"
          aria-label="Medical disclaimer"
          hidden={!expanded}
          className="border-t border-border bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.12)]"
          data-testid="disclaimer-full-panel-mobile"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-foreground">{DISCLAIMER_FULL}</p>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                toggleRef.current?.focus();
              }}
              aria-label="Close medical disclaimer"
              className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Collapsed footer bar — always visible */}
        <button
          type="button"
          ref={toggleRef}
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={
            expanded
              ? "Collapse medical disclaimer"
              : "Expand medical disclaimer"
          }
          className="flex min-h-[44px] w-full items-center justify-between bg-[#F8F9FA] px-4 py-2 text-sm text-muted-foreground shadow-[0_-2px_8px_rgba(0,0,0,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          data-testid="disclaimer-toggle"
        >
          <span className="text-left">{DISCLAIMER_SUMMARY}</span>
          <svg
            className={`ml-2 size-4 shrink-0 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/*  Desktop (>768px): inline below content, always visible             */}
      {/* ------------------------------------------------------------------- */}
      <div
        className="hidden md:block"
        data-testid="disclaimer-container-desktop"
        role="region"
        aria-label="Medical disclaimer"
      >
        <div className="mx-auto max-w-[960px] px-4 py-3 md:px-6 lg:px-8">
          <p
            className="text-[14px] font-normal text-muted-foreground"
            data-testid="disclaimer-full-panel-desktop"
          >
            {DISCLAIMER_FULL}
          </p>
        </div>
      </div>
    </>
  );
}
