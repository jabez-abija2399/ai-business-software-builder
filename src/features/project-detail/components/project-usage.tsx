"use client";

import { RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  OverviewChartMetric,
  OverviewRange,
  ProjectOverviewData,
} from "../types";
import { SectionBlock } from "./section";
import { ChartMetricToggle, UsageChart, seriesValue } from "./usage-chart";

export const RANGE_OPTIONS: { value: OverviewRange; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export function ProjectUsage({
  data,
  range,
  metric,
  onRangeChange,
  onMetricChange,
  onRefresh,
  freshLabel,
}: {
  data: ProjectOverviewData;
  range: OverviewRange;
  metric: OverviewChartMetric;
  onRangeChange: (range: OverviewRange) => void;
  onMetricChange: (metric: OverviewChartMetric) => void;
  onRefresh: () => void;
  freshLabel: string;
}) {
  const total = data.series.reduce((acc, p) => acc + (seriesValue(p, metric) ?? 0), 0);

  return (
    <SectionBlock>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Usage</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {metric === "runs" && `${total} runs over the selected period`}
            {metric === "tokens" && `${total.toLocaleString()} tokens over the selected period`}
            {metric === "cost" && `$${total.toFixed(2)} over the selected period`}
            {metric === "latency" && `average latency over the selected period`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh data"
            title={freshLabel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
          <Select value={range} onValueChange={(v) => onRangeChange(v as OverviewRange)}>
            <SelectTrigger className="h-8 w-[11rem] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-5 pt-4">
        <ChartMetricToggle value={metric} onChange={onMetricChange} />
      </div>

      <div className="px-5 pb-5 pt-4">
        <UsageChart series={data.series} metric={metric} />
      </div>
    </SectionBlock>
  );
}