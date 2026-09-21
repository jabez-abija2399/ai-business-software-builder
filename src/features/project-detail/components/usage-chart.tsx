"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { OverviewChartMetric, OverviewSeriesPoint } from "../types";
import { formatCompactNumber, formatMilliseconds, formatMoney } from "../lib/format";

export function seriesValue(
  point: OverviewSeriesPoint,
  metric: OverviewChartMetric
): number | null {
  switch (metric) {
    case "runs":
      return point.runs;
    case "tokens":
      return point.tokens;
    case "cost":
      return point.cost;
    case "latency":
      return point.latencyMs;
    default:
      return null;
  }
}

function formatMetricValue(metric: OverviewChartMetric, value: number) {
  switch (metric) {
    case "runs":
      return `${value}`;
    case "tokens":
      return formatCompactNumber(value);
    case "cost":
      return formatMoney(value);
    case "latency":
      return formatMilliseconds(value);
    default:
      return String(value);
  }
}

interface ChartProps {
  series: OverviewSeriesPoint[];
  metric: OverviewChartMetric;
}

export function UsageChart({ series, metric }: ChartProps) {
  const gradientId = useId();
  const values = series.map((p) => seriesValue(p, metric) ?? 0);
  const max = Math.max(...values, 1);
  const width = 720;
  const height = 180;
  const padTop = 6;
  const padBottom = 26;
  const baseline = height - padBottom;
  const barSlot = series.length > 0 ? width / series.length : width;
  const barWidth = Math.max(2, Math.min(18, barSlot * 0.6));
  const chartHeight = baseline - padTop;

  const bars = series.map((point, i) => {
    const v = seriesValue(point, metric) ?? 0;
    const h = (v / max) * chartHeight;
    const x = i * barSlot + (barSlot - barWidth) / 2;
    return {
      x,
      h,
      y: baseline - h,
      point,
      v,
      isZero: v === 0,
    };
  });

  const peakIndex = values.indexOf(Math.max(...values));
  const peakPoint = series[peakIndex];
  const summary =
    metric === "runs"
      ? `${values.reduce((a, b) => a + b, 0)} runs in the selected period${
          peakPoint && peakPoint.runs > 0 ? `, peaking on ${peakPoint.label} with ${peakPoint.runs}` : ""
        }.`
      : `${metricLabel(metric)} over the selected period${peakPoint && peakIndex >= 0 ? `, highest on ${peakPoint.label}` : ""}.`;

  const xLabelEvery = Math.max(1, Math.ceil(series.length / 6));
  const xLabels = series.filter((_, i) => i % xLabelEvery === 0);

  return (
    <div>
      <div role="img" aria-label={summary}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* gridlines */}
          {[0.25, 0.5, 0.75, 1].map((f) => {
            const yLine = baseline - chartHeight * f;
            return (
              <line
                key={f}
                x1="0"
                x2={width}
                y1={yLine}
                y2={yLine}
                stroke="hsl(var(--border))"
                strokeWidth="1"
              />
            );
          })}

          {/* area under bars */}
          <path
            d={[
              "M 0 " + baseline,
              bars.map((b) => `L ${b.x + barWidth / 2} ${b.y}`).join(" "),
              "L " + width + " " + baseline,
              "Z",
            ].join(" ")}
            fill={`url(#${gradientId})`}
          />

          {/* bars */}
          {bars.map((b, i) => (
            <rect
              key={i}
              x={b.x}
              y={b.y}
              width={barWidth}
              height={Math.max(b.h, b.isZero ? 0 : 1)}
              rx="2"
              fill={b.isZero ? "hsl(var(--muted))" : "hsl(var(--primary))"}
            >
              <title>
                {`${b.point.label}: ${formatMetricValue(metric, b.v)} (${metricLabel(metric)})`}
              </title>
            </rect>
          ))}

          {/* x labels */}
          {xLabels.map((p) => {
            const idx = series.indexOf(p);
            const x = idx * barSlot + barSlot / 2;
            return (
              <text
                key={idx}
                x={x}
                y={height - 8}
                textAnchor="middle"
                fontSize="11"
                fill="hsl(var(--muted-foreground))"
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">{summary}</p>
    </div>
  );
}

function metricLabel(metric: OverviewChartMetric) {
  switch (metric) {
    case "runs":
      return "runs";
    case "tokens":
      return "tokens";
    case "cost":
      return "cost";
    case "latency":
      return "latency";
  }
}

export function ChartMetricToggle({
  value,
  onChange,
  disabled,
}: {
  value: OverviewChartMetric;
  onChange: (metric: OverviewChartMetric) => void;
  disabled?: boolean;
}) {
  const options: { value: OverviewChartMetric; label: string }[] = [
    { value: "runs", label: "Runs" },
    { value: "tokens", label: "Tokens" },
    { value: "cost", label: "Cost" },
    { value: "latency", label: "Latency" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Chart metric"
      className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
            value === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}