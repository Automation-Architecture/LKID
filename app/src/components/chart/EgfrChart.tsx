"use client";

/**
 * LKID-19 — eGFR Trajectory Chart
 * Variant: A (Full Interactive) — POC confirmed:
 *   strokeDasharray works on LinePath (SVG native), phase band rects render correctly,
 *   @visx/tooltip + @visx/event localPoint work for both mouse and touch events.
 *   Bundle: @visx packages are tree-shaken; total ~42KB gzip (< 50KB threshold).
 *   Render perf: 4 lines × 15 points = minimal — well under 16ms on any device.
 *   → Implementing Variant A.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { Group } from "@visx/group";
import { LinePath, Bar, Line, area as d3Area } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { ParentSize } from "@visx/responsive";
import { curveMonotoneX, curveCatmullRom } from "@visx/curve";
import { Text } from "@visx/text";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { localPoint } from "@visx/event";

import type { ChartData, DataPoint, TooltipData, TrajectoryData } from "./types";
import { mergedTimePoints, selectDisplayTrajectories } from "./transform";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const X_DOMAIN: [number, number] = [0, 120];
const Y_TICKS = [0, 15, 30, 45, 60, 75, 90];
const X_TICKS = [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120];
const X_TICK_LABELS = ["0", "1yr", "2yr", "3yr", "4yr", "5yr", "6yr", "7yr", "8yr", "9yr", "10yr"];

// Responsive margins by breakpoint (legacy "chrome" mode — used by PDF).
const MARGIN_DESKTOP = { top: 20, right: 80, bottom: 48, left: 56 };
const MARGIN_TABLET = { top: 16, right: 64, bottom: 40, left: 48 };
const MARGIN_MOBILE = { top: 16, right: 48, bottom: 40, left: 40 };

const HEIGHT_DESKTOP = 340;
const HEIGHT_TABLET = 280;
const HEIGHT_MOBILE = 200;

// Design-mode margins (LKID-80 — matches project/Results.html line 396 viewBox).
// Inner axis labels (30/20/10/5/0 and 1-10 yr) live inside the chart area,
// so margins can be much tighter than chrome-mode.
const DESIGN_MARGIN = { top: 8, right: 28, bottom: 20, left: 36 };
const DESIGN_MARGIN_MOBILE = { top: 6, right: 22, bottom: 18, left: 30 };
// LKID-89: chart aspect ratio matches design viewBox 720:280 = 2.571:1.
// Height is computed from container width (via ParentSize) so the chart keeps
// the wide-short feel of project/Results.html. Mobile uses a slightly taller
// 2.0:1 ratio for legibility.
const DESIGN_ASPECT_DESKTOP = 720 / 280; // 2.571
const DESIGN_ASPECT_MOBILE = 2.0;
// Mobile floor — never collapse below this height even if the container is
// extremely narrow (e.g. iframe edge cases).
const DESIGN_MIN_HEIGHT_MOBILE = 180;

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getBreakpoint(width: number): "mobile" | "tablet" | "desktop" {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function getChartDimensions(
  width: number,
  designMode = false
): {
  height: number;
  margin: Margin;
  bp: "mobile" | "tablet" | "desktop";
} {
  const bp = getBreakpoint(width);
  if (designMode) {
    // Breakpoint at 880px matches project/Results.html:339 mobile rule.
    const mobile = width < 880;
    // LKID-89: derive height from aspect ratio to match design 720:280.
    const aspect = mobile ? DESIGN_ASPECT_MOBILE : DESIGN_ASPECT_DESKTOP;
    const computed = width / aspect;
    const height = mobile
      ? Math.max(DESIGN_MIN_HEIGHT_MOBILE, computed)
      : computed;
    return {
      height,
      margin: mobile ? DESIGN_MARGIN_MOBILE : DESIGN_MARGIN,
      bp: mobile ? "mobile" : "desktop",
    };
  }
  return {
    height: bp === "mobile" ? HEIGHT_MOBILE : bp === "tablet" ? HEIGHT_TABLET : HEIGHT_DESKTOP,
    margin: bp === "mobile" ? MARGIN_MOBILE : bp === "tablet" ? MARGIN_TABLET : MARGIN_DESKTOP,
    bp,
  };
}

/** Compute 5 y-axis tick values for design mode, Keep 0 at bottom + top
 *  anchored to actual yMax so trajectories never clip. Shape: [top, 2/3, 1/3, 1/6, 0]. */
function designYTicks(yMax: number): number[] {
  return [
    Math.round(yMax),
    Math.round((yMax * 2) / 3),
    Math.round(yMax / 3),
    Math.round(yMax / 6),
    0,
  ];
}

/** Resolve end-of-line label positions with 15px minimum separation. */
function resolveEndLabelPositions(
  trajectories: TrajectoryData[],
  yScale: (v: number) => number,
  minSep = 15
): Record<string, number> {
  // Sort by finalEgfr desc (highest eGFR on top = smallest y)
  const sorted = [...trajectories].sort((a, b) => b.finalEgfr - a.finalEgfr);
  const positions: Record<string, number> = {};

  for (const t of sorted) {
    positions[t.id] = yScale(t.finalEgfr);
  }

  // Push-apart pass: iterate sorted order and ensure minSep spacing
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevY = positions[prev.id];
    const currY = positions[curr.id];
    if (currY - prevY < minSep) {
      positions[curr.id] = prevY + minSep;
    }
  }

  // Clamp all positions to [0, innerHeight] to prevent labels escaping the chart
  const innerHeight = yScale(0);
  for (const id of Object.keys(positions)) {
    positions[id] = Math.max(0, Math.min(innerHeight, positions[id]));
  }

  return positions;
}

/** Find the nearest data point to an x position for a given trajectory. */
function findNearestPoint(
  points: DataPoint[],
  xValue: number
): DataPoint | null {
  if (!points.length) return null;
  return points.reduce((prev, curr) =>
    Math.abs(curr.monthsFromBaseline - xValue) <
    Math.abs(prev.monthsFromBaseline - xValue)
      ? curr
      : prev
  );
}

/* -------------------------------------------------------------------------- */
/*  Inner chart (receives fixed width from ParentSize)                        */
/* -------------------------------------------------------------------------- */

interface InnerChartProps {
  width: number;
  data: ChartData;
  selectedTrajectoryId: string | null;
  /** When true, render LKID-80 design-parity chart (no bands, no gridlines,
   *  inside axes, healthy gradient fill, tinted dialysis band, end-point
   *  callouts). Default false preserves existing chrome layout used by PDF. */
  designMode?: boolean;
}

function InnerChart({
  width,
  data,
  selectedTrajectoryId,
  designMode = false,
}: InnerChartProps) {
  const { height, margin, bp } = getChartDimensions(width, designMode);

  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const isMobile = bp === "mobile";

  // Compute y domain.
  //   chrome mode (PDF): max(90, maxEgfr + 10) — legacy behavior.
  //   design mode: snap yMax to the next "nice" ceiling among [30, 45, 60, 75, 90, 105]
  //   so y-axis labels stay readable integers (matches project/Results.html
  //   sample showing 30/20/10/5/0).
  const maxEgfr = Math.max(
    ...data.trajectories.flatMap((t) => t.points.map((p) => p.egfr))
  );
  const yMax = designMode
    ? (() => {
        const steps = [30, 45, 60, 75, 90, 105, 120];
        for (const s of steps) if (maxEgfr <= s) return s;
        return Math.ceil(maxEgfr / 15) * 15;
      })()
    : Math.max(90, maxEgfr + 10);

  // Scales
  const xScale = useMemo(
    () =>
      scaleLinear({
        domain: X_DOMAIN,
        range: [0, innerWidth],
      }),
    [innerWidth]
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, yMax],
        range: [innerHeight, 0],
      }),
    [innerHeight, yMax]
  );

  // X tick labels: every other on mobile
  const xTickValues = isMobile
    ? X_TICKS.filter((_, i) => i % 2 === 0)
    : X_TICKS;

  const xTickFormat = (v: { valueOf(): number }) => {
    const num = v.valueOf();
    const idx = X_TICKS.indexOf(num);
    if (isMobile) {
      // Mobile: show even-indexed ticks only
      const mobileVisible = X_TICKS.filter((_, i) => i % 2 === 0);
      const mIdx = mobileVisible.indexOf(num);
      return mIdx >= 0 ? (mIdx === 0 ? "0" : `${mIdx * 2}yr`) : "";
    }
    return idx >= 0 ? X_TICK_LABELS[idx] : "";
  };

  // Tooltip
  const { tooltipData, tooltipLeft, tooltipTop, tooltipOpen, showTooltip, hideTooltip } =
    useTooltip<TooltipData>();

  const overlayRef = useRef<SVGRectElement | null>(null);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;

      const xValue = xScale.invert(point.x);
      let closest: { traj: TrajectoryData; pt: DataPoint; dist: number } | null = null;

      for (const traj of data.trajectories) {
        const pt = findNearestPoint(traj.points, xValue);
        if (!pt) continue;
        const px = xScale(pt.monthsFromBaseline);
        const py = yScale(pt.egfr);
        const dist = Math.sqrt(
          Math.pow(point.x - px, 2) + Math.pow(point.y - py, 2)
        );
        if (!closest || dist < closest.dist) {
          closest = { traj, pt, dist };
        }
      }

      if (closest && closest.dist < 40) {
        showTooltip({
          tooltipData: {
            trajectoryId: closest.traj.id,
            label: closest.traj.label,
            color: closest.traj.color,
            egfr: closest.pt.egfr,
            months: closest.pt.monthsFromBaseline,
          },
          tooltipLeft: xScale(closest.pt.monthsFromBaseline) + margin.left,
          tooltipTop: yScale(closest.pt.egfr) + margin.top - 12,
        });
      } else {
        hideTooltip();
      }
    },
    [xScale, yScale, data.trajectories, showTooltip, hideTooltip, margin]
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;

      const xValue = xScale.invert(point.x);
      let closest: { traj: TrajectoryData; pt: DataPoint; dist: number } | null = null;

      for (const traj of data.trajectories) {
        const pt = findNearestPoint(traj.points, xValue);
        if (!pt) continue;
        const px = xScale(pt.monthsFromBaseline);
        const py = yScale(pt.egfr);
        const dist = Math.sqrt(
          Math.pow(point.x - px, 2) + Math.pow(point.y - py, 2)
        );
        if (!closest || dist < closest.dist) {
          closest = { traj, pt, dist };
        }
      }

      // 20px touch threshold as per spec
      if (closest && closest.dist < 20) {
        showTooltip({
          tooltipData: {
            trajectoryId: closest.traj.id,
            label: closest.traj.label,
            color: closest.traj.color,
            egfr: closest.pt.egfr,
            months: closest.pt.monthsFromBaseline,
          },
          tooltipLeft: xScale(closest.pt.monthsFromBaseline) + margin.left,
          tooltipTop: yScale(closest.pt.egfr) + margin.top - 12,
        });
      }
    },
    [xScale, yScale, data.trajectories, showTooltip, margin]
  );

  // Crosshair state (desktop)
  const [crosshairX, setCrosshairX] = useState<number | null>(null);

  const handleMouseMoveForCrosshair = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (point) {
        setCrosshairX(point.x);
      }
      handleMouseMove(event);
    },
    [handleMouseMove]
  );

  const handleMouseLeave = useCallback(() => {
    hideTooltip();
    setCrosshairX(null);
  }, [hideTooltip]);

  // End-of-line label positions
  const labelPositions = useMemo(
    () => resolveEndLabelPositions(data.trajectories, (v) => yScale(v)),
    [data.trajectories, yScale]
  );

  // Dynamic SVG desc — LKID-91 updates "best" anchor from BUN ≤12 (hidden)
  // to BUN 12-17, the new top displayed line.
  const trajectoryCount = data.trajectories.length;
  const bestFinal = data.trajectories.find((t) => t.id === "bun_13_17")?.finalEgfr ?? 0;
  const worstFinal = data.trajectories.find((t) => t.id === "no_treatment")?.finalEgfr ?? 0;

  return (
    <div style={{ position: "relative", width: "100%" }} data-testid="egfr-chart-container">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`eGFR trajectory chart showing ${trajectoryCount} predicted kidney function scenarios over 10 years`}
        data-testid="egfr-chart-svg"
      >
        <title>eGFR Trajectory — Predicted Kidney Function Over 10 Years</title>
        <desc>
          {`Starting eGFR: ${Math.round(data.baselineEgfr)}. Chart shows predicted eGFR values for BUN management scenarios. With BUN management (12-17), eGFR ends at ${bestFinal}. Without treatment, eGFR declines to ${worstFinal}.`}
        </desc>

        {/* Design-mode gradient definitions (LKID-80).
            Hex values mirror project/Results.html:398-405 exactly. */}
        {designMode && (
          <defs>
            <linearGradient id="kh-chart-green-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6CC24A" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#6CC24A" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="kh-chart-dialysis-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E08B8B" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#E08B8B" stopOpacity={0} />
            </linearGradient>
            {/* LKID-90 AC-1 — outcome-gap wedge. Soft green tint + diagonal
                hatch makes the divergence between BUN ≤ 12 (top) and No
                Treatment (bottom) read as a widening gap. */}
            <pattern
              id="kh-chart-gap-hatch"
              patternUnits="userSpaceOnUse"
              width={8}
              height={8}
              patternTransform="rotate(20)"
            >
              <rect width={8} height={8} fill="#3FA35B" fillOpacity={0.08} />
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={8}
                stroke="#374151"
                strokeOpacity={0.06}
                strokeWidth={1}
              />
            </pattern>
          </defs>
        )}

        <Group left={margin.left} top={margin.top}>
          {/* ---------------------------------------------------------------- */}
          {/*  Phase bands (chrome mode only — PDF)                            */}
          {/* ---------------------------------------------------------------- */}
          {!designMode && <Group aria-hidden="true">
            {data.phases.map((phase) => {
              const yTop = yScale(Math.min(yMax, phase.yStart === 90 ? yMax : phase.yStart));
              const yBottom = yScale(phase.yEnd);
              const bandHeight = yBottom - yTop;

              return (
                <g key={phase.label}>
                  <Bar
                    x={0}
                    y={yTop}
                    width={innerWidth}
                    height={Math.max(0, bandHeight)}
                    fill={phase.fillColor}
                    opacity={phase.opacity}
                  />
                  {/* Phase label: top-right corner, hidden on mobile.
                      LKID-67 (Inga): #888888 → #475569 slate-600 = 7.58:1 on
                      white (AA). */}
                  {!isMobile && (
                    <Text
                      x={innerWidth - 8}
                      y={yTop + 4}
                      textAnchor="end"
                      verticalAnchor="start"
                      fontSize={11}
                      fontWeight={400}
                      fill="#475569"
                    >
                      {phase.label}
                    </Text>
                  )}
                </g>
              );
            })}
          </Group>}

          {/* ---------------------------------------------------------------- */}
          {/*  Horizontal grid rows (chrome mode only — design has none)       */}
          {/* ---------------------------------------------------------------- */}
          {!designMode && (
            <GridRows
              scale={yScale}
              width={innerWidth}
              tickValues={Y_TICKS}
              stroke="rgba(0,0,0,0.12)"
              strokeWidth={1}
              aria-hidden="true"
            />
          )}

          {/* ---------------------------------------------------------------- */}
          {/*  Y-axis labels inside the plot area (design mode only — LKID-80) */}
          {/*  Matches project/Results.html:409-415 styling.                   */}
          {/* ---------------------------------------------------------------- */}
          {designMode && (() => {
            // LKID-89 (P1-1, P1-2): match project/Results.html:409-415 placement.
            // Design uses non-uniform y-positions [40, 100, 160, 220, 260] of a
            // 280-tall viewBox with a slight indent for single-digit values.
            // When yMax === 30 we honor the design's hand-tuned positions so
            // "5" sits just above the dashed dialysis line. Other yMax values
            // (45/60/75/90) fall back to proportional yScale spacing.
            const ticks = designYTicks(yMax);
            const useDesignPositions = yMax === 30;
            // Design coords are in viewBox units (280 tall). Map to inner-Group
            // coords by scaling to actual height and subtracting margin.top.
            const designYByValue: Record<number, number> = {
              30: 40,
              20: 100,
              10: 160,
              5: 220,
              0: 260,
            };
            const totalHeight = innerHeight + margin.top + margin.bottom;
            const mapDesignY = (designY: number) =>
              (designY / 280) * totalHeight - margin.top;
            return (
              <g
                aria-hidden="true"
                fontFamily="Nunito Sans, system-ui, sans-serif"
                fontSize="10"
                fill="#8A8D96"
              >
                {ticks.map((tick) => {
                  const isSingleDigit = tick < 10;
                  // P1-1: design x is 20 for two-digit, 24 for single-digit.
                  // Convert to inner-group coords by subtracting margin.left.
                  const designX = isSingleDigit ? 24 : 20;
                  const xInner = designX - margin.left;
                  const yInner = useDesignPositions && designYByValue[tick] !== undefined
                    ? mapDesignY(designYByValue[tick])
                    : yScale(tick) + 3;
                  return (
                    <text key={`y-${tick}`} x={xInner} y={yInner}>
                      {tick}
                    </text>
                  );
                })}
              </g>
            );
          })()}

          {/* ---------------------------------------------------------------- */}
          {/*  Healthy-range gradient fill under BUN ≤12 line (design mode).    */}
          {/*  Builds a closed path: green-line points → bottom-left corner.    */}
          {/* ---------------------------------------------------------------- */}
          {designMode && (() => {
            const green = data.trajectories.find((t) => t.id === "bun_lte_12");
            if (!green || green.points.length === 0) return null;
            // LKID-89 (P2-3): close the fill 5px past the bottom of the inner
            // plot area so the green gradient bleeds into the pink dialysis
            // band (in inner-group coords; the plot area runs y=0..innerHeight,
            // so innerHeight + 5 sits just below the bottom of the plot inside
            // the bottom margin — equivalent to design's y=275 of 280 once the
            // group transform is applied). Mirrors the design rather than
            // stopping at yScale(0).
            const baselineY = innerHeight + 5;
            // LKID-89 PR #66 review (NIT-03): use Catmull-Rom for the top edge
            // so the fill follows the same smoothed path as the trajectory
            // stroke (LinePath above). Straight `L` segments produced visible
            // divergence between fill edge and stroke at low point density.
            const areaGen = d3Area<DataPoint>({
              x: (pt) => xScale(pt.monthsFromBaseline),
              y0: () => baselineY,
              y1: (pt) => yScale(pt.egfr),
              curve: curveCatmullRom,
            });
            const d = areaGen(green.points) ?? "";
            return (
              <path
                d={d}
                fill="url(#kh-chart-green-fill)"
                aria-hidden="true"
                data-testid="chart-healthy-fill"
              />
            );
          })()}

          {/* ---------------------------------------------------------------- */}
          {/*  Dialysis threshold (chrome mode: red 2px dashed + "Dialysis      */}
          {/*  threshold" label;   design mode: pink tinted band + dashed       */}
          {/*  #E0A0A0 line + "Level where dialysis may be needed" label).     */}
          {/* ---------------------------------------------------------------- */}
          {!designMode && (
            <Group aria-hidden="true">
              <Line
                from={{ x: 0, y: yScale(data.dialysisThreshold) }}
                to={{ x: innerWidth, y: yScale(data.dialysisThreshold) }}
                stroke="#D32F2F"
                strokeWidth={2}
                strokeDasharray="6,3"
                data-testid="dialysis-threshold-line"
              />
              <Text
                x={innerWidth - 4}
                y={yScale(data.dialysisThreshold) - 4}
                textAnchor="end"
                verticalAnchor="end"
                fontSize={11}
                fontWeight={600}
                fill="#D32F2F"
              >
                Dialysis threshold
              </Text>
            </Group>
          )}

          {designMode && (() => {
            // LKID-89 (P0-2): pin the dashed dialysis line at 76.8% down the
            // chart, matching design's emphasis (project/Results.html:418
            // places the line at y=215 of a 280-tall viewBox = 215/280 = 0.768)
            // — but only when yMax === 30, the design's source domain. For
            // other yMax values (e.g. Stage 3a patients use yMax=60) the
            // 0.768 ratio drifts ~5 eGFR units off `data.dialysisThreshold`
            // while the label still says "dialysis may be needed". Fall back
            // to the data-driven yScale position for those cases (LKID-89
            // PR #66 review feedback: Copilot + CodeRabbit + Yuri NIT-01).
            // The line is decorative in design mode — engine-driven threshold
            // text remains in chrome mode (PDF) above.
            const totalHeight = innerHeight + margin.top + margin.bottom;
            const thresholdY = yMax === 30
              ? 0.768 * totalHeight - margin.top
              : yScale(data.dialysisThreshold);
            // Band height also scales with viewBox: design uses h=25 of 280 = 8.93%.
            const bandHeight = (25 / 280) * totalHeight;
            // P2-1: design label is at x=70 of viewBox (15px right of axis at x=55).
            // Convert to inner-group coords.
            const labelXInner = 70 - margin.left;
            return (
              <g aria-hidden="true" data-testid="dialysis-threshold-band">
                <rect
                  x={0}
                  y={thresholdY}
                  width={innerWidth}
                  height={bandHeight}
                  fill="url(#kh-chart-dialysis-fill)"
                />
                <line
                  x1={0}
                  y1={thresholdY}
                  x2={innerWidth}
                  y2={thresholdY}
                  stroke="#E0A0A0"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  data-testid="dialysis-threshold-line"
                />
                <text
                  x={labelXInner}
                  y={thresholdY - 6}
                  fontFamily="Nunito Sans, system-ui, sans-serif"
                  fontSize="10"
                  fill="#C54B4B"
                  fontWeight={500}
                >
                  Level where dialysis may be needed
                </text>
              </g>
            );
          })()}

          {/* ---------------------------------------------------------------- */}
          {/*  Outcome-gap wedge (design mode — LKID-90 AC-1).                 */}
          {/*  Diagonal-hatched fill between BUN ≤ 12 (top edge) and No        */}
          {/*  Treatment (bottom edge). Per Inga's design spike Option A this  */}
          {/*  is the structural fix for Lee's "no difference at year 10"      */}
          {/*  feedback. Year-10 caption is computed live from the engine      */}
          {/*  output, not hardcoded.                                          */}
          {/* ---------------------------------------------------------------- */}
          {designMode && (() => {
            const best = data.trajectories.find((t) => t.id === "bun_lte_12");
            const worst = data.trajectories.find((t) => t.id === "no_treatment");
            if (!best || !worst) return null;
            const len = Math.min(best.points.length, worst.points.length);
            if (len < 2) return null;
            const paired = Array.from({ length: len }, (_, i) => ({
              months: best.points[i].monthsFromBaseline,
              top: best.points[i].egfr,
              bottom: worst.points[i].egfr,
            }));
            const wedge = d3Area<{ months: number; top: number; bottom: number }>({
              x: (d) => xScale(d.months),
              y0: (d) => yScale(d.bottom),
              y1: (d) => yScale(d.top),
              curve: curveCatmullRom,
            });
            const wedgePath = wedge(paired) ?? "";
            const last = paired[paired.length - 1];
            const delta = Math.max(0, Math.round(last.top - last.bottom));
            const captionY = yScale((last.top + last.bottom) / 2);
            const captionX = xScale(last.months) - 8;
            return (
              <g data-testid="chart-outcome-gap-wedge">
                <path
                  d={wedgePath}
                  fill="url(#kh-chart-gap-hatch)"
                  aria-hidden="true"
                />
                {!isMobile && delta > 0 && (
                  <text
                    x={captionX}
                    y={captionY}
                    textAnchor="end"
                    fontFamily="Manrope, system-ui, sans-serif"
                    fontSize={11}
                    fontWeight={600}
                    fill="#1F2937"
                    aria-hidden="true"
                  >
                    {`~${delta} eGFR points difference at year 10`}
                  </text>
                )}
              </g>
            );
          })()}

          {/* ---------------------------------------------------------------- */}
          {/*  Crosshair (desktop only, behind trajectories)                  */}
          {/* ---------------------------------------------------------------- */}
          {!isMobile && crosshairX !== null && (
            <Group aria-hidden="true">
              <Line
                from={{ x: crosshairX, y: 0 }}
                to={{ x: crosshairX, y: innerHeight }}
                stroke="#E0E0E0"
                strokeWidth={1}
                strokeDasharray="4,2"
              />
              {tooltipData &&
                data.trajectories.map((traj) => {
                  const xVal = xScale.invert(crosshairX);
                  const pt = findNearestPoint(traj.points, xVal);
                  if (!pt) return null;
                  return (
                    <circle
                      key={traj.id}
                      cx={xScale(pt.monthsFromBaseline)}
                      cy={yScale(pt.egfr)}
                      r={4}
                      fill="white"
                      stroke={traj.color}
                      strokeWidth={2}
                    />
                  );
                })}
            </Group>
          )}

          {/* ---------------------------------------------------------------- */}
          {/*  Trajectory lines                                                */}
          {/* ---------------------------------------------------------------- */}
          <Group>
            {data.trajectories.map((traj) => {
              const isSelected = selectedTrajectoryId === traj.id;
              const hasSelection = selectedTrajectoryId !== null;
              // LKID-91 — chart simplifies to 2 displayed lines (BUN 12-17 +
              // No Treatment). Both displayed lines are anchors at full
              // emphasis. The legacy LKID-90 AC-1 mid-scenario de-emphasis
              // (`isMid`) is dormant on this branch since `bun_13_17` is now
              // itself an anchor; the chart still defends gracefully if a
              // third line is ever passed in.
              const isAnchor =
                designMode &&
                (traj.id === "bun_13_17" ||
                  traj.id === "bun_lte_12" ||
                  traj.id === "no_treatment");
              const isMid = designMode && !isAnchor;
              const baseWidth = designMode ? (isAnchor ? 3 : 2) : traj.strokeWidth;
              const baseOpacity = isMid ? 0.65 : 1.0;
              const opacity = hasSelection
                ? isSelected
                  ? 1.0
                  : 0.3
                : baseOpacity;
              const extraWidth = isSelected ? 1 : 0;

              return (
                <LinePath<DataPoint>
                  key={traj.id}
                  data={traj.points}
                  x={(d) => xScale(d.monthsFromBaseline)}
                  y={(d) => yScale(d.egfr)}
                  stroke={traj.color}
                  strokeWidth={baseWidth + extraWidth}
                  strokeDasharray={traj.strokeDasharray}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  curve={designMode ? curveCatmullRom : curveMonotoneX}
                  fill="none"
                  opacity={opacity}
                  style={
                    isSelected
                      ? { filter: `drop-shadow(0 0 3px ${traj.color})` }
                      : undefined
                  }
                  data-testid={`trajectory-line-${traj.id}`}
                />
              );
            })}
          </Group>

          {/* ---------------------------------------------------------------- */}
          {/*  Dialysis event markers (design mode — LKID-90 AC-2).            */}
          {/*  For each trajectory that crosses eGFR = 15 within the 10-year   */}
          {/*  window, render a filled marker + label at the interpolated      */}
          {/*  crossing point. WCAG AA contrast on label text via #9F2D2D.     */}
          {/*  No marker if a line never crosses.                              */}
          {/* ---------------------------------------------------------------- */}
          {designMode && (() => {
            const THRESHOLD = 15;
            type Crossing = {
              id: string;
              color: string;
              x: number;
              y: number;
              year: number;
            };
            const crossings: Crossing[] = [];
            for (const traj of data.trajectories) {
              const pts = traj.points;
              for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1];
                const curr = pts[i];
                if (prev.egfr >= THRESHOLD && curr.egfr < THRESHOLD) {
                  // Linear interpolation between the bounding points;
                  // mirrors the engine's compute_dial_age algorithm.
                  const denom = prev.egfr - curr.egfr || 1;
                  const frac = (prev.egfr - THRESHOLD) / denom;
                  const monthsCross =
                    prev.monthsFromBaseline +
                    frac *
                      (curr.monthsFromBaseline - prev.monthsFromBaseline);
                  crossings.push({
                    id: traj.id,
                    color: traj.color,
                    x: xScale(monthsCross),
                    y: yScale(THRESHOLD),
                    year: monthsCross / 12,
                  });
                  break;
                }
              }
            }
            if (crossings.length === 0) return null;
            const labelMinSep = 16;
            const sorted = [...crossings].sort((a, b) => a.x - b.x);
            const labelYByIndex: number[] = [];
            for (let i = 0; i < sorted.length; i++) {
              const baseY = sorted[i].y - 14;
              if (i === 0) {
                labelYByIndex.push(baseY);
              } else {
                const prevLabelY = labelYByIndex[i - 1];
                labelYByIndex.push(Math.min(baseY, prevLabelY - labelMinSep));
              }
            }
            return (
              <g data-testid="chart-dialysis-markers">
                {sorted.map((c, idx) => {
                  const yearLabel = `Year ${Math.max(1, Math.round(c.year))}`;
                  const flipLeft = c.x > innerWidth - 100;
                  const labelX = flipLeft ? c.x - 8 : c.x + 8;
                  const labelAnchor = flipLeft ? "end" : "start";
                  const labelY = labelYByIndex[idx];
                  return (
                    <g key={`dx-${c.id}`}>
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={6}
                        fill={c.color}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor={labelAnchor}
                        fontFamily="Manrope, system-ui, sans-serif"
                        fontSize={11}
                        fontWeight={600}
                        fill="#9F2D2D"
                      >
                        Dialysis range — {yearLabel}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* ---------------------------------------------------------------- */}
          {/*  End-of-line labels (chrome mode only — design uses callouts).   */}
          {/* ---------------------------------------------------------------- */}
          {!designMode && (
            <Group aria-hidden="true">
              {data.trajectories.map((traj) => {
                const lastPoint = traj.points[traj.points.length - 1];
                if (!lastPoint) return null;
                const x = xScale(lastPoint.monthsFromBaseline) + 8;
                const y = labelPositions[traj.id] ?? yScale(traj.finalEgfr);

                return (
                  <Text
                    key={traj.id}
                    x={x}
                    y={y}
                    verticalAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill={traj.color}
                  >
                    {Math.round(traj.finalEgfr)}
                  </Text>
                );
              })}
            </Group>
          )}

          {/* ---------------------------------------------------------------- */}
          {/*  End-point callouts (design mode — LKID-80; updated LKID-91).    */}
          {/*  Render the two displayed lines: BUN 12-17 (navy) and No         */}
          {/*  Treatment (gray) at the right edge. Values come from the        */}
          {/*  engine's computed final eGFR, NOT hardcoded.                    */}
          {/* ---------------------------------------------------------------- */}
          {designMode && (() => {
            const mid = data.trajectories.find((t) => t.id === "bun_13_17");
            const noTx = data.trajectories.find((t) => t.id === "no_treatment");
            const callouts = [mid, noTx].filter(
              (t): t is TrajectoryData => !!t && t.points.length > 0
            );
            if (callouts.length === 0) return null;

            // Compute y positions and push-apart if the two circles (r=16,
            // diameter 32) would overlap vertically.
            const rawYs = callouts.map((t) => {
              const last = t.points[t.points.length - 1];
              return { id: t.id, color: t.color, value: last.egfr, y: yScale(last.egfr) };
            });
            // Sort by y ascending (top of chart first).
            rawYs.sort((a, b) => a.y - b.y);
            const minSep = 34;
            for (let i = 1; i < rawYs.length; i++) {
              if (rawYs[i].y - rawYs[i - 1].y < minSep) {
                rawYs[i].y = rawYs[i - 1].y + minSep;
              }
            }
            const cx = innerWidth - 16;

            return (
              <g aria-hidden="true" data-testid="chart-endpoint-callouts">
                {rawYs.map((c) => (
                  <g key={c.id}>
                    <circle
                      cx={cx}
                      cy={c.y}
                      r={16}
                      fill="#fff"
                      stroke={c.color}
                      strokeWidth={1.5}
                    />
                    <text
                      x={cx}
                      y={c.y + 4}
                      textAnchor="middle"
                      fontFamily="Manrope, system-ui, sans-serif"
                      fontWeight={700}
                      fontSize={13}
                      fill={c.color}
                      data-testid={`chart-endpoint-value-${c.id}`}
                    >
                      {Math.round(c.value)}
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}

          {/* ---------------------------------------------------------------- */}
          {/*  Starting eGFR callout at left edge (design mode — LKID-90 AC-4) */}
          {/*  Anchors the day-zero value as a numeric label, not just a tick. */}
          {/* ---------------------------------------------------------------- */}
          {designMode && (() => {
            const startX = xScale(0);
            const startY = yScale(data.baselineEgfr);
            const labelText = `Starting eGFR: ${Math.round(data.baselineEgfr)}`;
            // Position label to the right of the anchor dot. On mobile the
            // chart is narrow, so cap label so it never extends past 60% of
            // the inner width.
            const labelX = startX + 12;
            return (
              <g data-testid="chart-starting-egfr">
                <circle
                  cx={startX}
                  cy={startY}
                  r={5}
                  fill="#1F2577"
                  stroke="#fff"
                  strokeWidth={2}
                />
                <text
                  x={labelX}
                  y={startY - 8}
                  fontFamily="Manrope, system-ui, sans-serif"
                  fontSize={isMobile ? 11 : 12}
                  fontWeight={600}
                  fill="#1F2577"
                >
                  {labelText}
                </text>
              </g>
            );
          })()}

          {/* ---------------------------------------------------------------- */}
          {/*  X-axis labels inside the chart (design mode — LKID-80).         */}
          {/*  Matches project/Results.html:443-453 styling. 1yr/2yr/.../10yr. */}
          {/* ---------------------------------------------------------------- */}
          {designMode && (
            <g
              aria-hidden="true"
              fontFamily="Nunito Sans, system-ui, sans-serif"
              fontSize="10"
              fill="#8A8D96"
            >
              {[12, 24, 36, 48, 60, 72, 84, 96, 108, 120].map((m, idx, arr) => {
                if (isMobile && idx % 2 === 1) return null; // thin on mobile
                const yr = m / 12;
                // LKID-89 (P1-3): match design — labels sit 5px above the
                // bottom of the inner plot area (in inner-group coords;
                // remember the Group is translated by margin.top, so this
                // y maps to the same visual position as design's y=275 of 280
                // once you account for the top/bottom margin split). Visually
                // the labels overlap the pink dialysis fill rather than
                // sitting below the chart.
                const yLabel = innerHeight - 5;
                // LKID-89 (P1-4): last tick ("10 yr") clears the endpoint
                // circle (centered at innerWidth-16, r=16). textAnchor="end"
                // and a small left offset land the text to the left of the
                // circle, matching design's x=650 placement.
                const isLast = idx === arr.length - 1;
                const anchor = isLast ? "end" : "middle";
                const xLabel = isLast ? xScale(m) - 36 : xScale(m);
                return (
                  <text
                    key={`x-${m}`}
                    x={xLabel}
                    y={yLabel}
                    textAnchor={anchor}
                  >
                    {yr} yr
                  </text>
                );
              })}
            </g>
          )}

          {/* ---------------------------------------------------------------- */}
          {/*  Axes (chrome mode only — design mode uses inline axis text).    */}
          {/* ---------------------------------------------------------------- */}
          {!designMode && (
            <>
              <AxisBottom
                scale={xScale}
                top={innerHeight}
                tickValues={xTickValues}
                tickFormat={xTickFormat}
                stroke="#E0E0E0"
                tickStroke="#E0E0E0"
                tickLabelProps={{
                  fontSize: 11,
                  fill: "#666666",
                  textAnchor: "middle",
                }}
                label="Years"
                labelProps={{
                  fontSize: 12,
                  fontWeight: 500,
                  fill: "#666666",
                  textAnchor: "middle",
                }}
              />
              <AxisLeft
                scale={yScale}
                tickValues={Y_TICKS}
                stroke="#E0E0E0"
                tickStroke="#E0E0E0"
                tickLabelProps={{
                  fontSize: 11,
                  fill: "#666666",
                  textAnchor: "end",
                  dx: "-0.25em",
                  dy: "0.3em",
                }}
                label={isMobile ? "" : "eGFR (mL/min/1.73m\u00B2)"}
                labelProps={{
                  fontSize: 12,
                  fontWeight: 500,
                  fill: "#666666",
                  textAnchor: "middle",
                }}
              />
            </>
          )}

          {/* ---------------------------------------------------------------- */}
          {/*  Invisible overlay for mouse/touch events                        */}
          {/* ---------------------------------------------------------------- */}
          <Bar
            innerRef={overlayRef}
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onMouseMove={!isMobile ? handleMouseMoveForCrosshair : undefined}
            onMouseLeave={!isMobile ? handleMouseLeave : undefined}
            onTouchStart={isMobile ? handleTouchStart : undefined}
            onTouchEnd={isMobile ? hideTooltip : undefined}
            style={{ cursor: "crosshair" }}
          />
        </Group>

        {/* Confidence tier badge — top right (chrome mode only — design omits).
            LKID-67 (Inga): Tier-1 stroke/text migrated from #1D9E75 (3.39:1 on
            white; 3.02:1 on #E8F5F0 pill) → #047857 emerald-700 (5.48:1 on
            white; 4.90:1 on pill). Matches new BUN ≤12 trajectory so the
            semantic link "Tier 1 = rigorous BUN control = best path" reads
            through color. Tier-2 amber #92400E already meets AA (7.09:1). */}
        {!designMode && (
          <g aria-hidden="true">
            <rect
              x={width - margin.right - 60}
              y={6}
              width={56}
              height={20}
              rx={4}
              fill={data.confidenceTier === 1 ? "#E8F5F0" : "#FFF8E1"}
              stroke={data.confidenceTier === 1 ? "#047857" : "#F59E0B"}
              strokeWidth={1}
            />
            <text
              x={width - margin.right - 32}
              y={20}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill={data.confidenceTier === 1 ? "#047857" : "#92400E"}
            >
              Tier {data.confidenceTier}
            </text>
          </g>
        )}
      </svg>

      {/* ---------------------------------------------------------------------- */}
      {/*  Tooltip (rendered outside SVG via portal)                            */}
      {/* ---------------------------------------------------------------------- */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            background: "white",
            border: "1px solid #E0E0E0",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            padding: "8px 12px",
            pointerEvents: "none",
            minWidth: 140,
            transition: "opacity 150ms ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: tooltipData.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {tooltipData.label}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 400 }}>
            eGFR: {Math.round(tooltipData.egfr)} mL/min/1.73m²
          </div>
          <div style={{ fontSize: 12, fontWeight: 400, color: "#666666" }}>
            at {tooltipData.months} months
            {tooltipData.months >= 12
              ? ` (${tooltipData.months / 12}yr)`
              : ""}
          </div>
        </TooltipWithBounds>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/*  Screen-reader accessible data table (sr-only)                        */}
      {/* ---------------------------------------------------------------------- */}
      <table
        className="sr-only"
        data-testid="egfr-chart-data-table"
        aria-label="eGFR trajectory data table"
      >
        <caption>Predicted eGFR values over 10 years for the displayed treatment scenarios.</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            {data.trajectories.map((t) => (
              <th key={t.id} scope="col">
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mergedTimePoints(data.trajectories).map((month) => (
            <tr key={month}>
              <td>{month} months</td>
              {data.trajectories.map((t) => {
                const pt = t.points.find((p) => p.monthsFromBaseline === month);
                return <td key={t.id}>{pt ? Math.round(pt.egfr) : ""}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat cards                                                                */
/* -------------------------------------------------------------------------- */

interface StatCardsProps {
  trajectories: TrajectoryData[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function StatCards({ trajectories, selectedId, onSelect }: StatCardsProps) {
  return (
    <div
      className="mt-4 grid grid-cols-2 gap-2"
      role="group"
      aria-label="Trajectory scenarios"
    >
      {trajectories.map((traj) => {
        const isSelected = selectedId === traj.id;
        const pointAt5yr = traj.points.find((p) => p.monthsFromBaseline === 60);
        const pointAt10yr = traj.points.find((p) => p.monthsFromBaseline === 120);

        return (
          <button
            key={traj.id}
            aria-pressed={isSelected}
            aria-label={`${traj.label} scenario${isSelected ? ", selected" : ""}`}
            onClick={() => onSelect(isSelected ? null : traj.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(isSelected ? null : traj.id);
              } else if (e.key === "Escape") {
                onSelect(null);
              }
            }}
            className={`rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              isSelected
                ? "border-2 bg-muted/60 shadow-md"
                : "border-border bg-card hover:bg-muted/40"
            }`}
            style={isSelected ? { borderColor: traj.color } : undefined}
            data-testid={`stat-card-${traj.id}`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: traj.color }}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-foreground">
                {traj.label}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div>
                <span className="text-xs text-muted-foreground">5yr eGFR</span>
                {/* LKID-67: re-tokened from inline traj.color hex (failed AA 4.5:1)
                    to text-foreground (~17:1 on white). Scenario semantic color
                    is preserved via the dot swatch at line 705 above. */}
                <p className="text-lg font-bold text-foreground">
                  {pointAt5yr ? Math.round(pointAt5yr.egfr) : "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">10yr eGFR</span>
                <p className="text-base font-semibold text-foreground">
                  {pointAt10yr ? Math.round(pointAt10yr.egfr) : "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Dialysis:{" "}
                  {traj.dialysisAge !== null
                    ? `~age ${Math.round(traj.dialysisAge)} yr`
                    : "Not projected"}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main export: EgfrChart                                                    */
/* -------------------------------------------------------------------------- */

interface EgfrChartProps {
  data: ChartData;
  /**
   * Controls whether the chart renders its own card chrome (header, footnote,
   * StatCards) around the SVG. Default `true` preserves the legacy layout used
   * by the PDF pipeline (`/internal/chart/[token]`). Pass `false` on the
   * `/results/[token]` Results page so the chart renders as a bare SVG matching
   * `project/Results.html` (LKID-80) — the Results page owns the section title,
   * legend column, and scenario cards itself.
   */
  chrome?: boolean;
}

export function EgfrChart({ data, chrome = true }: EgfrChartProps) {
  const [selectedTrajectoryId, setSelectedTrajectoryId] = useState<string | null>(null);

  // Design mode is the inverse of "chrome" — when the Results page removes its
  // outer chrome, it wants the inner SVG in design-parity mode (LKID-80).
  const designMode = !chrome;

  // LKID-91 — Lee feedback (2026-04-30): chart simplifies to 2 displayed
  // lines (BUN 12-17 + No Treatment). The engine still emits all 4
  // trajectories upstream; this is the last filter at the chart-rendering
  // boundary. Hidden trajectories: bun_lte_12 (green) and bun_18_24 (gold).
  // Healthy-range gradient fill (anchored to bun_lte_12) and outcome-gap
  // wedge (anchored to bun_lte_12 + no_treatment) auto-disappear because
  // their `find()` lookups return undefined and the JSX bails to null.
  const displayData = useMemo(() => selectDisplayTrajectories(data), [data]);

  if (designMode) {
    return (
      <div
        style={{ position: "relative", width: "100%" }}
        data-testid="egfr-chart-wrapper"
      >
        <ParentSize>
          {({ width }) =>
            width > 0 ? (
              <InnerChart
                width={width}
                data={displayData}
                selectedTrajectoryId={selectedTrajectoryId}
                designMode
              />
            ) : null
          }
        </ParentSize>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-border bg-white"
      data-testid="egfr-chart-wrapper"
    >
      {/* Chart header — HTML above SVG */}
      <div className="px-4 pt-3">
        <h2 className="text-[15px] font-bold text-foreground leading-tight">
          eGFR Trajectory
        </h2>
        <p className="text-[12px] font-normal text-muted-foreground mt-0.5">
          Predicted kidney function over 10 years
        </p>
      </div>

      {/* Responsive SVG via ParentSize */}
      <div className="px-0 pt-2">
        <ParentSize>
          {({ width }) =>
            width > 0 ? (
              <InnerChart
                width={width}
                data={displayData}
                selectedTrajectoryId={selectedTrajectoryId}
              />
            ) : null
          }
        </ParentSize>
      </div>

      {/* Footnote — HTML below SVG */}
      {/* LKID-67: re-tokened from #888888 (3.9:1, failed AA) to
          text-muted-foreground (~5.7:1 on white). */}
      <p
        className="mt-2 px-4 pb-3 text-[12px] italic text-muted-foreground"
        data-testid="chart-footnote"
      >
        <em>
          Data points are plotted at actual time intervals. Early measurements
          are more frequent.
        </em>
      </p>

      {/* Stat cards (LKID-91: 2 cards — BUN 12-17, No Treatment) */}
      <div className="border-t border-border px-4 pb-4">
        <StatCards
          trajectories={displayData.trajectories}
          selectedId={selectedTrajectoryId}
          onSelect={setSelectedTrajectoryId}
        />
      </div>
    </div>
  );
}
