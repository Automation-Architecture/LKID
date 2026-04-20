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
import { LinePath, Bar, Line } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { ParentSize } from "@visx/responsive";
import { curveMonotoneX } from "@visx/curve";
import { Text } from "@visx/text";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { localPoint } from "@visx/event";

import type { ChartData, DataPoint, TooltipData, TrajectoryData } from "./types";
import { mergedTimePoints } from "./transform";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const X_DOMAIN: [number, number] = [0, 120];
const Y_TICKS = [0, 15, 30, 45, 60, 75, 90];
const X_TICKS = [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120];
const X_TICK_LABELS = ["0", "1yr", "2yr", "3yr", "4yr", "5yr", "6yr", "7yr", "8yr", "9yr", "10yr"];

// Responsive margins by breakpoint
const MARGIN_DESKTOP = { top: 20, right: 80, bottom: 48, left: 56 };
const MARGIN_TABLET = { top: 16, right: 64, bottom: 40, left: 48 };
const MARGIN_MOBILE = { top: 16, right: 48, bottom: 40, left: 40 };

const HEIGHT_DESKTOP = 340;
const HEIGHT_TABLET = 280;
const HEIGHT_MOBILE = 200;

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

function getChartDimensions(width: number): {
  height: number;
  margin: Margin;
  bp: "mobile" | "tablet" | "desktop";
} {
  const bp = getBreakpoint(width);
  return {
    height: bp === "mobile" ? HEIGHT_MOBILE : bp === "tablet" ? HEIGHT_TABLET : HEIGHT_DESKTOP,
    margin: bp === "mobile" ? MARGIN_MOBILE : bp === "tablet" ? MARGIN_TABLET : MARGIN_DESKTOP,
    bp,
  };
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
}

function InnerChart({ width, data, selectedTrajectoryId }: InnerChartProps) {
  const { height, margin, bp } = getChartDimensions(width);

  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const isMobile = bp === "mobile";

  // Compute y domain: max(90, maxEgfr + 10)
  const maxEgfr = Math.max(
    ...data.trajectories.flatMap((t) => t.points.map((p) => p.egfr))
  );
  const yMax = Math.max(90, maxEgfr + 10);

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

  // Dynamic SVG desc
  const bestFinal = data.trajectories.find((t) => t.id === "bun_lte_12")?.finalEgfr ?? 0;
  const worstFinal = data.trajectories.find((t) => t.id === "no_treatment")?.finalEgfr ?? 0;

  return (
    <div style={{ position: "relative", width: "100%" }} data-testid="egfr-chart-container">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="eGFR trajectory chart showing 4 predicted kidney function scenarios over 10 years"
        data-testid="egfr-chart-svg"
      >
        <title>eGFR Trajectory — Predicted Kidney Function Over 10 Years</title>
        <desc>
          {`Chart shows predicted eGFR values for four BUN management scenarios. Best outcome (BUN \u2264 12) maintains eGFR at ${bestFinal}. Worst outcome (no treatment) declines to ${worstFinal}.`}
        </desc>

        <Group left={margin.left} top={margin.top}>
          {/* ---------------------------------------------------------------- */}
          {/*  Phase bands (z-order: bottommost)                               */}
          {/* ---------------------------------------------------------------- */}
          <Group aria-hidden="true">
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
                  {/* Phase label: top-right corner, hidden on mobile */}
                  {!isMobile && (
                    <Text
                      x={innerWidth - 8}
                      y={yTop + 4}
                      textAnchor="end"
                      verticalAnchor="start"
                      fontSize={11}
                      fontWeight={400}
                      fill="#888888"
                    >
                      {phase.label}
                    </Text>
                  )}
                </g>
              );
            })}
          </Group>

          {/* ---------------------------------------------------------------- */}
          {/*  Horizontal grid rows                                            */}
          {/* ---------------------------------------------------------------- */}
          <GridRows
            scale={yScale}
            width={innerWidth}
            tickValues={Y_TICKS}
            stroke="rgba(0,0,0,0.12)"
            strokeWidth={1}
            aria-hidden="true"
          />

          {/* ---------------------------------------------------------------- */}
          {/*  Dialysis threshold line (above bands, below trajectories)       */}
          {/* ---------------------------------------------------------------- */}
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
              const opacity = hasSelection ? (isSelected ? 1.0 : 0.3) : 1.0;
              const extraWidth = isSelected ? 1 : 0;

              return (
                <LinePath<DataPoint>
                  key={traj.id}
                  data={traj.points}
                  x={(d) => xScale(d.monthsFromBaseline)}
                  y={(d) => yScale(d.egfr)}
                  stroke={traj.color}
                  strokeWidth={traj.strokeWidth + extraWidth}
                  strokeDasharray={traj.strokeDasharray}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  curve={curveMonotoneX}
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
          {/*  End-of-line labels                                              */}
          {/* ---------------------------------------------------------------- */}
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

          {/* ---------------------------------------------------------------- */}
          {/*  Axes                                                            */}
          {/* ---------------------------------------------------------------- */}
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

        {/* Confidence tier badge — top right */}
        <g aria-hidden="true">
          <rect
            x={width - margin.right - 60}
            y={6}
            width={56}
            height={20}
            rx={4}
            fill={data.confidenceTier === 1 ? "#E8F5F0" : "#FFF8E1"}
            stroke={data.confidenceTier === 1 ? "#1D9E75" : "#F59E0B"}
            strokeWidth={1}
          />
          <text
            x={width - margin.right - 32}
            y={20}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill={data.confidenceTier === 1 ? "#1D9E75" : "#92400E"}
          >
            Tier {data.confidenceTier}
          </text>
        </g>
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
        <caption>Predicted eGFR values over 10 years for 4 treatment scenarios.</caption>
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
      className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4"
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
}

export function EgfrChart({ data }: EgfrChartProps) {
  const [selectedTrajectoryId, setSelectedTrajectoryId] = useState<string | null>(null);

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
                data={data}
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

      {/* Stat cards */}
      <div className="border-t border-border px-4 pb-4">
        <StatCards
          trajectories={data.trajectories}
          selectedId={selectedTrajectoryId}
          onSelect={setSelectedTrajectoryId}
        />
      </div>
    </div>
  );
}
