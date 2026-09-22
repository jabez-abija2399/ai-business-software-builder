import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { READY_DEPLOYMENT_STATUSES } from "@/lib/pipeline";
import { getProjectHealth } from "@/server/db/monitoring";
import { formatMilliseconds, formatTimeAgo } from "@/features/project-detail/lib/format";
import { StatusChip } from "@/features/monitoring/components/status-chip";
import { RefreshButton } from "@/features/monitoring/components/refresh-button";
import { HealthCheckButton } from "@/features/monitoring/components/health-check-button";

export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<string, string> = {
  BLUEPRINT_ANALYSIS: "Blueprint",
  DESIGN_GENERATION: "Design",
  SCAFFOLD_PROJECT: "Scaffold project",
  GENERATE_COMPONENTS: "Components",
  GENERATE_PAGES: "Pages",
  GENERATE_API_ROUTES: "API routes",
  GENERATE_DATABASE: "Database",
  GENERATE_TESTS: "Tests (generation)",
  GENERATE_STYLES: "Styles",
  INSTALL_DEPENDENCIES: "Install dependencies",
  RUN_LINT: "Lint",
  RUN_TYPECHECK: "Typecheck",
  TESTS: "Tests (run)",
  SECURITY: "Security",
  ACCESSIBILITY: "Accessibility",
  PERFORMANCE: "Performance",
  GITHUB_PUBLISH: "Publish to GitHub",
};

export default async function HealthPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const { projectId } = await params;
  const health = await getProjectHealth(projectId, session.user.id);
  if (!health) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Health</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            The genuine last state of every pipeline stage and deployment for {health.project.name}.
          </p>
        </div>
        <RefreshButton />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Pipeline stages</h2>
        {health.stages.every((stage) => stage.run === null) ? (
          <p className="text-[13px] text-muted-foreground">
            No pipeline runs recorded for this project yet.
          </p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {health.stages.map((stage) => {
              const run = stage.run;
              return (
                <li key={stage.taskType} className="rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-medium">
                      {STAGE_LABELS[stage.taskType] ?? stage.taskType}
                    </span>
                    {run ? <StatusChip value={run.status} /> : <StatusChip value="UNKNOWN" />}
                  </div>
                  {run ? (
                    <div className="mt-1 space-y-0.5 text-[12px] text-muted-foreground">
                      <p>
                        <span className="font-mono">{run.taskType}</span>
                        {run.provider ? ` · ${run.provider}` : ""}
                        {run.durationMs != null ? ` · ${formatMilliseconds(run.durationMs)}` : ""}
                      </p>
                      {(run.status === "FAILED" || run.status === "ERROR") && run.errorMessage && (
                        <p className="leading-relaxed text-destructive">{run.errorMessage}</p>
                      )}
                      <p>{formatTimeAgo(run.createdAt)}</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[12px] text-muted-foreground">Stage not run yet.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Deployments</h2>
        {health.deployments.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No deployments for this project yet.</p>
        ) : (
          <ul className="space-y-2">
            {health.deployments.map(({ environment, latest }) => {
              const healthMeta =
                latest?.metadata &&
                typeof latest.metadata.health === "object" &&
                latest.metadata.health !== null
                  ? (latest.metadata.health as {
                      status?: string;
                      latencyMs?: number | null;
                      httpStatus?: number | null;
                      error?: string | null;
                      checkedAt?: string;
                    })
                  : null;
              return (
                <li key={environment} className="rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[13px] font-medium capitalize">{environment}</span>
                    <div className="flex gap-1.5">
                      <StatusChip value={latest?.status ?? "PENDING"} />
                      {latest?.healthStatus && <StatusChip value={latest.healthStatus} />}
                    </div>
                  </div>

                  <div className="mt-1.5 space-y-1 text-[12px] text-muted-foreground">
                    {latest?.deploymentUrl ? (
                      <a
                        href={latest.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {latest.deploymentUrl}
                      </a>
                    ) : (
                      <p>No URL provisioned for this environment yet.</p>
                    )}
                    <p>
                      <span className="font-mono">{latest?.provider ?? "—"}</span>
                      {latest?.createdAt ? ` · deployed ${formatTimeAgo(latest.createdAt)}` : ""}
                    </p>

                    {latest?.healthCheckedAt ? (
                      <p className="tabular-nums">
                        Last checked {formatTimeAgo(latest.healthCheckedAt)}
                        {healthMeta?.latencyMs != null
                          ? ` · ${formatMilliseconds(healthMeta.latencyMs)}`
                          : ""}
                        {healthMeta?.httpStatus != null ? ` · HTTP ${healthMeta.httpStatus}` : ""}
                      </p>
                    ) : (
                      <p>Not health-checked yet.</p>
                    )}
                    {healthMeta?.error && (
                      <p className="leading-relaxed text-destructive">{healthMeta.error}</p>
                    )}
                  </div>

                  {latest &&
                  READY_DEPLOYMENT_STATUSES.includes(latest.status) &&
                  !(latest.deploymentUrl ?? "").startsWith("/") && (
                    <div className="mt-3">
                      <HealthCheckButton projectId={projectId} deploymentId={latest.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}