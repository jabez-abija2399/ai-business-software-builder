import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUsageAnalytics } from "@/server/db/usage";
import { isAnalyticsConfigured } from "@/server/analytics/service";
import { formatMilliseconds, formatNumber } from "@/features/project-detail/lib/format";
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

function Section({
  title,
  children,
  hint,
}: {
  title: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
      </div>
      {children}
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

export default async function UsagePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const data = await getUsageAnalytics(session.user.id);
  const analyticsConfigured = isAnalyticsConfigured();

  const maxActivity = Math.max(
    1,
    ...data.activity.map((day) => Math.max(day.runs, day.deploys, day.projects))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Usage</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Real first-party usage from your actual projects, runs and deployments — no estimates.
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="rounded-lg border border-border bg-card px-4 py-3 text-[12px] text-muted-foreground">
        {analyticsConfigured
          ? "Product analytics is configured (PostHog). This dashboard still reports purely first-party data."
          : "Product analytics (PostHog) is not configured — set POSTHOG_API_KEY to enable server-side event capture. This dashboard always works from the database."}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Projects" value={formatNumber(data.summary.projectCount)} />
        <SummaryCard label="Pipeline runs" value={formatNumber(data.summary.runCount)} />
        <SummaryCard label="Deployments" value={formatNumber(data.summary.deployCount)} />
        <SummaryCard
          label="Completed runs"
          value={formatNumber(data.summary.completedRunCount)}
          hint="Actual runs that reached COMPLETED."
        />
        <SummaryCard
          label="Avg run duration"
          value={data.summary.avgRunDurationMs != null ? formatMilliseconds(data.summary.avgRunDurationMs) : "—"}
          hint="Mean of real completed-run durations (start → finish)."
        />
        <SummaryCard
          label="Ready deployments"
          value={formatNumber(data.summary.readyDeployCount)}
          hint="Deployments reported READY by the provider."
        />
      </div>

      <Section title="Activity — last 14 days" hint="Real rows per day (UTC): runs created, deployments created, projects created.">
        {data.activity.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No activity in the last 14 days.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="space-y-2">
              {data.activity.map((day) => {
                const barWidths = {
                  runs: Math.round((day.runs / maxActivity) * 100),
                  deploys: Math.round((day.deploys / maxActivity) * 100),
                  projects: Math.round((day.projects / maxActivity) * 100),
                };
                return (
                  <div key={day.date} className="grid grid-cols-[64px_1fr] items-center gap-3 text-[12px]">
                    <span className="tabular-nums text-muted-foreground">{day.label}</span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${barWidths.runs}%` }} />
                        </div>
                        <span className="w-10 tabular-nums text-right text-muted-foreground">{day.runs} runs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary/60" style={{ width: `${barWidths.deploys}%` }} />
                        </div>
                        <span className="w-10 tabular-nums text-right text-muted-foreground">{day.deploys} deploys</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary/30" style={{ width: `${barWidths.projects}%` }} />
                        </div>
                        <span className="w-10 tabular-nums text-right text-muted-foreground">{day.projects} projects</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Runs by stage" hint="All-time, real AgentRun rows per pipeline stage.">
          {data.runsByStage.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No pipeline runs yet.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card p-4">
              <ul className="space-y-2">
                {data.runsByStage.map((stage) => (
                  <li key={stage.taskType} className="flex items-center justify-between gap-3 text-[12.5px]">
                    <div className="font-mono">{stage.taskType}</div>
                    <div className="flex items-center gap-2 tabular-nums text-muted-foreground">
                      {stage.completed > 0 && stage.avgDurationMs != null ? (
                        <span>{formatMilliseconds(stage.avgDurationMs)} avg</span>
                      ) : null}
                      {stage.failed > 0 ? <span className="text-destructive">{stage.failed} failed</span> : null}
                      <span>{stage.completed} completed</span>
                      <span>{stage.count} total</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <Section title="Top projects" hint="Most pipeline runs (all-time).">
          {data.topProjects.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No projects with runs yet.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card p-4">
              <ul className="space-y-2">
                {data.topProjects.map((project) => (
                  <li key={project.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                    <Link href={`/projects/${project.id}/health`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                    <span className="tabular-nums text-muted-foreground">{project.runCount} runs</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <Breakdown title="Runs by status" counts={data.runsByStatus} />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <Breakdown title="Deployments by environment" counts={data.deploysByEnvironment} />
          </div>
        </div>
      </div>
    </div>
  );
}