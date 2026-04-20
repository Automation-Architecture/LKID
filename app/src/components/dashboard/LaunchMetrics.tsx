"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

// LKID-75 — Lee dashboard v2 launch-metrics panel.
//
// Fetches the backend DB-driven metrics every 10 minutes and renders:
//   - A 4-card KPI row (total predictions / total leads / opt-in rate /
//     last-24h predictions)
//   - A 7-day predictions-per-day bar chart (pure SVG-free, inline
//     div widths — same visual language as HeroBanner's timeline)
//   - A BUN tier distribution horizontal bar chart
//   - A recent-leads table (HIPAA-masked at the backend — this component
//     never sees raw emails / names / lab values)
//   - Two skeleton "Coming soon" placeholder cards for the PostHog and
//     Klaviyo integrations (env vars blocked on Brad-hands backlog).

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

type Counts = {
  total: number;
  last_7d: number;
  last_24h: number;
};

type OptInRate = {
  percent: number | null;
  visible: boolean;
  reason: string | null;
  min_sample: number;
};

type PerDay = {
  day: string;
  count: number;
};

type RecentLead = {
  created_at: string | null;
  name_initial: string;
  email_masked: string;
  bun_tier: string;
};

type MetricsResponse = {
  generated_at: string;
  predictions: Counts;
  leads: Counts;
  opt_in_rate: OptInRate;
  bun_tier_distribution: Record<string, number>;
  predictions_per_day: PerDay[];
  recent_leads: RecentLead[];
};

// Ordered bucket keys so the chart rows always render in a predictable
// clinical-stage sequence regardless of JSON iteration order.
const BUN_TIER_ORDER = ["<=12", "13-17", "18-24", ">24", "unknown"] as const;

const BUN_TIER_COLOR: Record<string, string> = {
  "<=12": "var(--s-green)",
  "13-17": "var(--s-blue)",
  "18-24": "var(--s-yellow)",
  ">24": "#B1553A", // warm orange for the highest tier — still in brand range
  unknown: "var(--s-gray)",
};

const BUN_TIER_LABEL: Record<string, string> = {
  "<=12": "BUN ≤ 12",
  "13-17": "BUN 13–17",
  "18-24": "BUN 18–24",
  ">24": "BUN > 24",
  unknown: "Unknown",
};

function formatPercent(rate: OptInRate): string {
  if (!rate.visible || rate.percent === null) {
    return "—";
  }
  return `${rate.percent.toFixed(1)}%`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

function KpiCard({
  label,
  value,
  sublabel,
  muted,
}: {
  label: string;
  value: string;
  sublabel?: string;
  muted?: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "var(--brand-divider)",
      }}
    >
      <div
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--brand-body)" }}
      >
        {label}
      </div>
      <div
        className="mt-2 text-3xl font-bold"
        style={{
          color: muted ? "var(--brand-gray)" : "var(--brand-teal)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sublabel ? (
        <div
          className="mt-1 text-xs"
          style={{ color: "var(--brand-body)" }}
        >
          {sublabel}
        </div>
      ) : null}
    </div>
  );
}

function SparklineBars({ series }: { series: PerDay[] }) {
  // Bar chart: each bar height is count / max(count), min 6% so a zero-day
  // still shows a faint baseline. `generate_series` in the backend
  // guarantees exactly 7 entries, so we can render a fixed grid.
  const max = Math.max(1, ...series.map((s) => s.count));

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "var(--brand-divider)",
      }}
    >
      <div
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--brand-body)" }}
      >
        Predictions — last 7 days
      </div>
      <div className="mt-4 flex h-24 items-end gap-2">
        {series.map((d) => {
          const pct = Math.max(6, Math.round((d.count / max) * 100));
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${pct}%`,
                  backgroundColor: "var(--brand-teal)",
                  opacity: d.count === 0 ? 0.2 : 1,
                }}
                aria-label={`${d.count} predictions on ${d.day}`}
              />
              <div
                className="text-[10px]"
                style={{ color: "var(--brand-body)" }}
              >
                {d.day.slice(5)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BunDistribution({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const total = BUN_TIER_ORDER.reduce(
    (acc, key) => acc + (distribution[key] ?? 0),
    0
  );

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "var(--brand-divider)",
      }}
    >
      <div
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--brand-body)" }}
      >
        BUN tier distribution
      </div>
      <div className="mt-4 space-y-3">
        {total === 0 ? (
          <p className="text-sm" style={{ color: "var(--brand-body)" }}>
            No predictions yet.
          </p>
        ) : (
          BUN_TIER_ORDER.map((key) => {
            const count = distribution[key] ?? 0;
            const pct = total === 0 ? 0 : Math.round((count / total) * 100);
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span style={{ color: "var(--brand-black)" }}>
                    {BUN_TIER_LABEL[key]}
                  </span>
                  <span
                    style={{
                      color: "var(--brand-body)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {count} ({pct}%)
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full"
                  style={{ backgroundColor: "var(--brand-track)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: BUN_TIER_COLOR[key],
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RecentLeadsTable({ leads }: { leads: RecentLead[] }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "var(--brand-divider)",
      }}
    >
      <div
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--brand-body)" }}
      >
        Recent leads
      </div>
      {leads.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: "var(--brand-body)" }}>
          No leads captured yet.
        </p>
      ) : (
        <table className="mt-3 w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Time", "Initial", "Email (masked)", "BUN Tier"].map((h) => (
                <th
                  key={h}
                  className="pb-2 pr-2 text-left text-xs font-medium uppercase tracking-wide"
                  style={{
                    color: "var(--brand-body)",
                    borderBottom: "1px solid var(--brand-divider-subtle)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((l, i) => (
              <tr key={`${l.email_masked}-${l.created_at ?? i}`}>
                <td
                  className="py-2 pr-2"
                  style={{
                    color: "var(--brand-body)",
                    borderBottom: "1px solid var(--brand-divider-subtle)",
                  }}
                >
                  {formatRelative(l.created_at)}
                </td>
                <td
                  className="py-2 pr-2 font-medium"
                  style={{
                    color: "var(--brand-black)",
                    borderBottom: "1px solid var(--brand-divider-subtle)",
                  }}
                >
                  {l.name_initial}
                </td>
                <td
                  className="py-2 pr-2"
                  style={{
                    color: "var(--brand-body)",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    borderBottom: "1px solid var(--brand-divider-subtle)",
                  }}
                >
                  {l.email_masked}
                </td>
                <td
                  className="py-2 pr-2"
                  style={{
                    color: "var(--brand-body)",
                    borderBottom: "1px solid var(--brand-divider-subtle)",
                  }}
                >
                  {BUN_TIER_LABEL[l.bun_tier] ?? l.bun_tier}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PlaceholderCard({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  // Skeleton / "coming soon" card — intentionally styled so Lee reads it
  // as "feature pending" rather than "dashboard is broken". Diagonal
  // stripe hatch + low-opacity navy matches the existing brand palette.
  return (
    <div
      className="relative overflow-hidden rounded-xl border p-4"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: "var(--brand-divider)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(31,37,119,0.04) 0, rgba(31,37,119,0.04) 8px, transparent 8px, transparent 16px)",
        }}
      />
      <div className="relative">
        <div
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--brand-body)" }}
        >
          {title}
        </div>
        <div className="mt-3 space-y-2">
          <div
            className="h-3 w-1/2 rounded"
            style={{ backgroundColor: "var(--brand-track)" }}
          />
          <div
            className="h-3 w-2/3 rounded"
            style={{ backgroundColor: "var(--brand-track)" }}
          />
          <div
            className="h-3 w-1/3 rounded"
            style={{ backgroundColor: "var(--brand-track)" }}
          />
        </div>
        <div
          className="mt-4 inline-block rounded-full px-3 py-1 text-xs font-medium"
          style={{
            backgroundColor: "var(--s-blue-bg)",
            color: "var(--s-blue-text)",
          }}
        >
          Coming soon
        </div>
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--brand-body)" }}
        >
          {note}
        </p>
      </div>
    </div>
  );
}

export function LaunchMetrics({ slug }: { slug: string }) {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          apiUrl(`/client/${encodeURIComponent(slug)}/metrics`),
          { cache: "no-store" }
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as MetricsResponse;
        if (!cancelled) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    }

    load();
    const id = setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [slug]);

  return (
    <section
      className="space-y-6"
      aria-labelledby="launch-metrics-heading"
    >
      <div className="flex items-baseline justify-between">
        <h2
          id="launch-metrics-heading"
          className="text-2xl font-bold"
          style={{ color: "var(--brand-teal)" }}
        >
          Launch Metrics
        </h2>
        {data?.generated_at ? (
          <span
            className="text-xs"
            style={{ color: "var(--brand-body)" }}
          >
            Refreshed {formatRelative(data.generated_at)}
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{
            backgroundColor: "#FEE2E2",
            borderColor: "#FECACA",
            color: "#991B1B",
          }}
          role="alert"
        >
          Unable to load launch metrics right now. Retrying in a few
          minutes. (debug: {error})
        </div>
      ) : null}

      {/* KPI row — 4 small stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Total predictions"
          value={
            loading ? "…" : (data?.predictions.total ?? 0).toLocaleString()
          }
          sublabel={
            data
              ? `${data.predictions.last_7d} in last 7d`
              : "—"
          }
        />
        <KpiCard
          label="Total leads"
          value={loading ? "…" : (data?.leads.total ?? 0).toLocaleString()}
          sublabel={
            data ? `${data.leads.last_7d} in last 7d` : "—"
          }
        />
        <KpiCard
          label="Opt-in rate"
          value={loading || !data ? "…" : formatPercent(data.opt_in_rate)}
          sublabel={
            data?.opt_in_rate.visible
              ? "leads ÷ predictions"
              : `Need ≥ ${data?.opt_in_rate.min_sample ?? 10} predictions`
          }
          muted={!loading && data ? !data.opt_in_rate.visible : false}
        />
        <KpiCard
          label="Last 24h predictions"
          value={loading ? "…" : (data?.predictions.last_24h ?? 0).toString()}
          sublabel={
            data ? `${data.leads.last_24h} leads in 24h` : "—"
          }
        />
      </div>

      {/* Row 2: sparkline + BUN distribution */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SparklineBars series={data?.predictions_per_day ?? []} />
        <BunDistribution
          distribution={data?.bun_tier_distribution ?? {}}
        />
      </div>

      {/* Row 3: recent leads table */}
      <RecentLeadsTable leads={data?.recent_leads ?? []} />

      {/* Placeholder cards — blocked on Brad-hands backlog (Vercel env vars) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PlaceholderCard
          title="Conversion funnel"
          note="Landing → /labs → /gate → /results → PDF. Awaiting PostHog integration (Sprint 5+)."
        />
        <PlaceholderCard
          title="Email performance"
          note="Open + click rates for the transactional report email. Awaiting Klaviyo API key."
        />
      </div>
    </section>
  );
}
