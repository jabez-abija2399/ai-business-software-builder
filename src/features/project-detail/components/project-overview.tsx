"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { overviewRangeSchema } from "@/validations/overview";
import { useProjectActivity, useProjectOverview } from "../hooks/use-project-overview";
import { useFreshness } from "../hooks/use-freshness";
import type { OverviewChartMetric, OverviewRange } from "../types";
import { ProjectAttention } from "./project-attention";
import { ProjectHealth } from "./project-health";
import { ProjectSetupProgress } from "./project-setup-progress";
import { ProjectOnboarding } from "./project-onboarding";
import { ProjectMetricsGrid } from "./project-metrics-grid";
import { ProjectUsage } from "./project-usage";
import { ProjectActivityColumns } from "./project-activity-columns";
import { ProjectRecentActivity } from "./project-recent-activity";
import { SectionError } from "./section-error";
import { OverviewInlineSkeleton } from "./project-overview-skeleton";

export function ProjectOverview({
  projectId,
  initialRange,
}: {
  projectId: string;
  initialRange: OverviewRange;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [metric, setMetric] = useState<OverviewChartMetric>("runs");

  // Range lives in the URL so dashboards can be shared (§50).
  const rawRange = searchParams.get("range") ?? undefined;
  const parsedRange = overviewRangeSchema.safeParse(rawRange);
  const range: OverviewRange = parsedRange.success ? parsedRange.data : initialRange;

  const overview = useProjectOverview(projectId, range);
  const activity = useProjectActivity(projectId);

  const data = overview.data;
  const freshLabel = useFreshness(data?.updatedAt ?? activity.data?.updatedAt);
  const totalActivity =
    (data?.metrics.runs ?? 0) + (activity.data?.items.length ?? 0);
  // Onboarding is only for projects with nothing to analyze. A project that has
  // runs or deployments shows real analytics even without a formal blueprint.
  const isTrulyEmpty = Boolean(
    data &&
      !data.lifecycle.hasBlueprint &&
      !data.lifecycle.hasRuns &&
      !data.lifecycle.hasDeployments &&
      totalActivity === 0
  );
  const isReadyNoActivity = Boolean(
    data &&
      data.lifecycle.hasBlueprint &&
      !data.lifecycle.hasRuns &&
      totalActivity === 0
  );
  const showOnboarding = isTrulyEmpty || isReadyNoActivity;

  function setRange(next: OverviewRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next);
    router.replace(`/projects/${projectId}?${params.toString()}`);
  }

  function refresh() {
    void Promise.all([overview.refetch(), activity.refetch()]);
  }

  return (
    <div className="space-y-6">
      {data && data.attention.length > 0 && <ProjectAttention items={data.attention} />}

      {data ? (
        <ProjectHealth health={data.health} />
      ) : overview.isError && !overview.data ? (
        <SectionError title="Health unavailable" onRetry={() => overview.refetch()} />
      ) : (
        <OverviewInlineSkeleton className="h-14 w-full" />
      )}

      {data && <ProjectSetupProgress steps={data.setup} />}

      {/* Onboarding replaces analytics only while the project has nothing yet (§10–§11). */}
      {showOnboarding && data && (
        <ProjectOnboarding project={data.project} lifecycle={data.lifecycle} />
      )}

      {!showOnboarding && (
        <>
          {data ? (
            <ProjectMetricsGrid metrics={data.metrics} />
          ) : overview.isError && !overview.data ? (
            <SectionError title="Metrics unavailable" onRetry={() => overview.refetch()} />
          ) : (
            <OverviewInlineSkeleton className="grid grid-cols-2 gap-3 lg:grid-cols-5" />
          )}

          {data ? (
            <ProjectUsage
              data={data}
              range={range}
              metric={metric}
              onRangeChange={setRange}
              onMetricChange={setMetric}
              onRefresh={refresh}
              freshLabel={freshLabel}
            />
          ) : overview.isError && !overview.data ? (
            <SectionError
              title="Usage data unavailable"
              detail="We couldn't load usage data for this project."
              onRetry={() => overview.refetch()}
            />
          ) : (
            <OverviewInlineSkeleton className="h-72 w-full" />
          )}

          {data ? (
            <ProjectActivityColumns
              providers={data.providers}
              models={data.models}
              isEmpty={data.metrics.runs === 0}
            />
          ) : overview.isError && !overview.data ? (
            <SectionError title="Provider data unavailable" onRetry={() => overview.refetch()} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <OverviewInlineSkeleton className="h-48 w-full" />
              <OverviewInlineSkeleton className="h-48 w-full" />
            </div>
          )}
        </>
      )}

      {activity.data ? (
        <ProjectRecentActivity items={activity.data.items} />
      ) : activity.isError && !activity.data ? (
        <SectionError title="Activity unavailable" onRetry={() => activity.refetch()} />
      ) : (
        <OverviewInlineSkeleton className="h-48 w-full" />
      )}

      <p className="pb-1 text-[11px] text-muted-foreground tabular-nums">
        {freshLabel}
      </p>
    </div>
  );
}