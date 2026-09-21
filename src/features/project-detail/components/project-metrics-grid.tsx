import type { OverviewMetrics } from "../types";
import { formatCompactNumber, formatMilliseconds, formatMoney, formatPercent } from "../lib/format";
import { MetricCard } from "./metric-card";

export function ProjectMetricsGrid({ metrics }: { metrics: OverviewMetrics }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          label="Runs"
          value={formatCompactNumber(metrics.runs)}
          delta={metrics.runsDeltaPct}
          hint="agent runs in the period"
        />
        <MetricCard
          label="Tokens"
          value={formatCompactNumber(metrics.tokens)}
          delta={metrics.tokensDeltaPct}
          hint={metrics.tokens == null ? "not recorded yet" : "estimated across runs"}
        />
        <MetricCard
          label="Spend"
          value={formatMoney(metrics.spend)}
          delta={metrics.spendDeltaPct}
          hint={metrics.spend == null ? "not recorded yet" : "estimated AI cost"}
        />
        <MetricCard
          label="Avg latency"
          value={formatMilliseconds(metrics.latencyMs)}
          delta={metrics.latencyDeltaPct}
          invertDelta
          hint={metrics.latencyMs == null ? "no completed runs yet" : "per completed run"}
        />
        <MetricCard
          label="Error rate"
          value={formatPercent(metrics.errorRatePct)}
          delta={metrics.errorRateDeltaPct}
          invertDelta
          hint={metrics.errorRatePct == null ? "no runs yet" : "of runs in the period"}
        />
      </div>
      <p className="text-[12px] text-muted-foreground">
        {metrics.requirements} requirements · {metrics.features} features ·{" "}
        {metrics.deployments} deployments
      </p>
    </div>
  );
}