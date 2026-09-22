import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPlatformMonitoring } from "@/server/db/monitoring";
import {
  formatMilliseconds,
  formatNumber,
  formatTimeAgo,
} from "@/features/project-detail/lib/format";
import { StatusChip } from "@/features/monitoring/components/status-chip";
import { RefreshButton } from "@/features/monitoring/components/refresh-button";

export const dynamic = "force-dynamic";

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Breakdown({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    return (
      <div>
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Nothing recorded yet.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-[13px] font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {entries.map(([status, count]) => (
          <li key={status} className="flex items-center justify-between gap-3 text-[12.5px]">
            <StatusChip value={status} />
            <span className="tabular-nums text-muted-foreground">{formatNumber(count)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function MonitoringPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const data = await getPlatformMonitoring(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Monitoring</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Real reliability data from actual pipeline runs and deployments across your projects.
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Projects" value={formatNumber(data.summary.projectCount)} />
        <SummaryCard label="Pipeline runs" value={formatNumber(data.summary.runCount)} />
        <SummaryCard label="Deployments" value={formatNumber(data.summary.deployCount)} />
        <SummaryCard
          label="Failed runs (24h)"
          value={formatNumber(data.summary.failedRuns24h)}
          hint="Actual FAILED / ERROR / CANCELLED runs in the last 24 hours."
        />
        <SummaryCard
          label="Ready deployments"
          value={formatNumber(data.summary.readyDeployCount)}
          hint="Deployments Vercel reported as READY."
        />
        <SummaryCard
          label="Deployments up"
          value={formatNumber(data.summary.upDeployCount)}
          hint="Ready deployments that a real health probe found responding."
        />
        <SummaryCard
          label="Avg run duration"
          value={data.summary.avgRunDurationMs != null ? formatMilliseconds(data.summary.avgRunDurationMs) : "—"}
          hint="Mean of real completed-run durations (start → finish)."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <Breakdown title="Runs by status" counts={data.summary.runsByStatus} />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Breakdown title="Deployments by status" counts={data.summary.deploysByStatus} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">Recent runs</h2>
          {data.recentRuns.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No pipeline runs yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentRuns.map((run) => (
                <li key={run.id} className="rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/projects/${run.projectId}/health`}
                      className="text-[13px] font-medium hover:underline"
                    >
                      {run.projectName}
                    </Link>
                    <StatusChip value={run.status} />
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    <span className="font-mono">{run.taskType}</span>
                    {run.provider ? ` · ${run.provider}` : ""}
                    {run.durationMs != null ? ` · ${formatMilliseconds(run.durationMs)}` : ""}
                    {run.status === "FAILED" || run.status === "ERROR" ? (
                      <span className="text-destructive"> · {run.errorMessage}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatTimeAgo(run.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">Recent deployments</h2>
          {data.recentDeployments.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No deployments yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentDeployments.map((deployment) => (
                <li key={deployment.id} className="rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/projects/${deployment.projectId}/health`}
                      className="text-[13px] font-medium hover:underline"
                    >
                      {deployment.projectName}
                    </Link>
                    <div className="flex gap-1.5">
                      <StatusChip value={deployment.status} />
                      {deployment.healthStatus && (
                        <StatusChip value={deployment.healthStatus} />
                      )}
                    </div>
                  </div>
                  <p className="mt-1 break-all text-[12px] text-muted-foreground">
                    <span className="capitalize">{deployment.environment}</span>
                    {" · "}
                    <span className="font-mono">{deployment.provider}</span>
                    {deployment.deploymentUrl ? (
                      <>
                        {" · "}
                        <a
                          href={deployment.deploymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {deployment.deploymentUrl}
                        </a>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatTimeAgo(deployment.createdAt)}
                    {deployment.healthCheckedAt
                      ? ` · checked ${formatTimeAgo(deployment.healthCheckedAt)}`
                      : " · not health-checked yet"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">Audit feed</h2>
          {data.recentAudit.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No audit entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentAudit.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-[13px]">
                    <span className="font-mono text-[12px]">{entry.action}</span>
                    <span className="text-muted-foreground"> on </span>
                    {entry.projectName ?? <span className="text-muted-foreground">{entry.entityType}</span>}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {entry.entityType}
                    {entry.projectName ? ` · ${entry.projectName}` : ""} · {formatTimeAgo(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}