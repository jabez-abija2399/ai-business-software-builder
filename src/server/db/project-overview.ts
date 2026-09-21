import prisma from "@/lib/prisma";
import { deriveProjectStatus } from "./projects";
import type {
  OverviewRange,
  ProjectOverviewData,
} from "@/features/project-detail/types";

export type ProjectAccess = "owner" | "member" | "none";

/**
 * Loads a project the session user may access (owner or org member), plus a
 * light snapshot of lifecycle-relevant records. Returns `null` when the
 * project is missing or the user has no access. Also serves the shared
 * ProjectDetailShell (header + nav) so every tab inherits the same header.
 */
export async function getAccessibleProject(
  projectId: string,
  userId: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      environment: true,
      mode: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      organizationId: true,
      ownerId: true,
      blueprints: {
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, version: true, status: true },
      },
      deployments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, deploymentUrl: true, environment: true },
      },
      approvals: {
        where: { status: "PENDING" },
        take: 1,
        select: { id: true, riskLevel: true, summary: true },
      },
      issues: {
        where: { status: "OPEN" },
        take: 1,
        select: { id: true, title: true, severity: true },
      },
      testRecords: { take: 1, select: { id: true } },
      _count: {
        select: {
          requirements: true,
          features: true,
          agentRuns: true,
          deployments: true,
          design: true,
        },
      },
    },
  });

  if (!project) return null;

  if (project.ownerId !== userId) {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: project.organizationId },
      select: { id: true },
    });
    if (!membership) return null;
  }

  return project;
}

const ERROR_STATUSES = new Set(["FAILED", "ERROR", "CANCELLED"]);
const RUNNING_STATUSES = new Set(["QUEUED", "RUNNING", "IN_PROGRESS"]);

const RANGE_DAYS: Record<OverviewRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

interface GenWindow {
  startsAt: Date;
  endsAt: Date;
  bucketCount: number;
  bucket: (date: Date) => number;
  bucketDate: (idx: number) => Date;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildWindow(range: OverviewRange, now: Date): GenWindow {
  const days = RANGE_DAYS[range];
  // Double range: same aggregate for the previous equal-length period so
  // deltas are honest comparisons.
  const startsAt = new Date(now.getTime() - days * 2 * 86_400_000);

  if (range === "24h") {
    const bucket = (d: Date) =>
      Math.floor((d.getTime() - startsAt.getTime()) / 3_600_000);
    const bucketDate = (idx: number) =>
      new Date(startsAt.getTime() + idx * 3_600_000);
    return { startsAt, endsAt: now, bucketCount: 48, bucket, bucketDate };
  }

  const wsod = startOfDay(startsAt).getTime();
  const bucket = (d: Date) =>
    Math.floor((startOfDay(d).getTime() - wsod) / 86_400_000);
  const bucketDate = (idx: number) => new Date(wsod + idx * 86_400_000);
  return { startsAt, endsAt: now, bucketCount: days * 2, bucket, bucketDate };
}

function isError(status: string) {
  return ERROR_STATUSES.has(status);
}

function isRunning(status: string) {
  return RUNNING_STATUSES.has(status);
}

function extractTokens(tokenUsage: unknown): number | null {
  if (tokenUsage == null) return null;
  let t: unknown = tokenUsage;
  if (typeof t === "string") {
    try {
      t = JSON.parse(t);
    } catch {
      return null;
    }
  }
  if (typeof t !== "object" || t === null) return null;
  const rec = t as Record<string, unknown>;
  const parts =
    typeof rec.prompt_tokens === "number" && typeof rec.completion_tokens === "number"
      ? rec.prompt_tokens + rec.completion_tokens
      : typeof rec.inputTokens === "number" && typeof rec.outputTokens === "number"
        ? rec.inputTokens + rec.outputTokens
        : null;
  const total =
    rec.total_tokens ?? rec.totalTokens ?? rec.outputTokens ?? parts;
  if (typeof total !== "number" || !Number.isFinite(total)) return null;
  return total;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function pctDelta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return round(((current - previous) / previous) * 100);
}

function formatBucketDate(date: Date, range: OverviewRange): { date: string; label: string } {
  if (range === "24h") {
    return {
      date: date.toISOString(),
      label: date.toLocaleTimeString("en-US", { hour: "numeric", hour12: false }),
    };
  }
  if (range === "7d") {
    return {
      date: date.toISOString(),
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
    };
  }
  return {
    date: date.toISOString(),
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

export interface OverviewRunRow {
  id: string;
  taskType: string;
  agentType: string;
  status: string;
  provider: string | null;
  model: string | null;
  tokenUsage: unknown;
  estimatedCost: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  errorMessage: string | null;
}

function aggregateWindow(rows: OverviewRunRow[]) {
  let runs = 0;
  let errors = 0;
  let tokensSum = 0;
  let tokensCount = 0;
  let spendSum = 0;
  let spendCount = 0;
  let latencySum = 0;
  let latencyCount = 0;
  const providerMap = new Map<
    string,
    { requests: number; tokens: number; cost: number; errors: number }
  >();
  const modelMap = new Map<
    string,
    {
      requests: number;
      tokens: number;
      cost: number;
      latencySum: number;
      latencyCount: number;
    }
  >();

  for (const row of rows) {
    runs += 1;
    const failed = isError(row.status);
    if (failed) errors += 1;
    const tokens = extractTokens(row.tokenUsage);
    if (tokens != null) {
      tokensSum += tokens;
      tokensCount += 1;
    }
    if (row.estimatedCost != null) {
      spendSum += row.estimatedCost;
      spendCount += 1;
    }
    const duration =
      row.startedAt && row.completedAt
        ? row.completedAt.getTime() - row.startedAt.getTime()
        : null;
    if (duration != null && duration >= 0) {
      latencySum += duration;
      latencyCount += 1;
    }

    if (row.provider) {
      const p =
        providerMap.get(row.provider) ?? { requests: 0, tokens: 0, cost: 0, errors: 0 };
      p.requests += 1;
      if (tokens != null) p.tokens += tokens;
      if (row.estimatedCost != null) p.cost += row.estimatedCost;
      if (failed) p.errors += 1;
      providerMap.set(row.provider, p);
    }
    if (row.model) {
      const m =
        modelMap.get(row.model) ??
        { requests: 0, tokens: 0, cost: 0, latencySum: 0, latencyCount: 0 };
      m.requests += 1;
      if (tokens != null) m.tokens += tokens;
      if (row.estimatedCost != null) m.cost += row.estimatedCost;
      if (duration != null && duration >= 0) {
        m.latencySum += duration;
        m.latencyCount += 1;
      }
      modelMap.set(row.model, m);
    }
  }

  return {
    runs,
    errors,
    tokens: tokensCount > 0 ? round(tokensSum) : null,
    spend: spendCount > 0 ? round(spendSum) : null,
    latencyMs: latencyCount > 0 ? round(latencySum / latencyCount) : null,
    errorRatePct: runs > 0 ? round((errors / runs) * 100) : null,
    providers: Array.from(providerMap.entries()).map(([provider, v]) => ({
      provider,
      requests: v.requests,
      tokens: round(v.tokens),
      cost: round(v.cost),
      errors: v.errors,
    })).sort((a, b) => b.requests - a.requests),
    models: Array.from(modelMap.entries()).map(([model, v]) => ({
      model,
      requests: v.requests,
      tokens: round(v.tokens),
      cost: round(v.cost),
      latencyMs: v.latencyCount > 0 ? round(v.latencySum / v.latencyCount) : null,
    })).sort((a, b) => b.requests - a.requests),
  };
}

/**
 * Builds the Overview analytics payload for a project. Every value derives
 * from stored project records — absent data yields `null`/empty values, never
 * invented figures.
 */
export async function getProjectOverviewStats(
  projectId: string,
  range: OverviewRange
): Promise<ProjectOverviewData> {
  const now = new Date();
  const window = buildWindow(range, now);
  const days = RANGE_DAYS[range];
  const currentStart = new Date(now.getTime() - days * 86_400_000);

  const [
    project,
    windowRuns,
    deploymentRows,
    pendingApprovals,
    openIssues,
    latestRun,
    providerCounts,
    modelCounts,
    qualityRuns,
  ] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        environment: true,
        mode: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        blueprints: {
          orderBy: { version: "desc" },
          take: 1,
          select: { version: true, status: true },
        },
        deployments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, deploymentUrl: true },
        },
        issues: { take: 1, select: { id: true } },
        testRecords: { take: 1, select: { id: true } },
        _count: {
          select: {
            requirements: true,
            features: true,
            agentRuns: true,
            deployments: true,
            design: true,
          },
        },
      },
    }),
    prisma.agentRun.findMany({
      where: { projectId, createdAt: { gte: window.startsAt, lte: window.endsAt } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        taskType: true,
        agentType: true,
        status: true,
        provider: true,
        model: true,
        tokenUsage: true,
        estimatedCost: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        errorMessage: true,
      },
    }),
    prisma.deployment.findMany({
      where: { projectId, createdAt: { gte: window.startsAt, lte: window.endsAt } },
      select: { createdAt: true },
    }),
    prisma.approval.count({ where: { projectId, status: "PENDING" } }),
    prisma.knownIssue.count({ where: { projectId, status: "OPEN" } }),
    prisma.agentRun.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { status: true, errorMessage: true, createdAt: true },
    }),
    prisma.agentRun.groupBy({
      by: ["provider"],
      where: { projectId, provider: { not: null } },
      _count: { _all: true },
    }),
    prisma.agentRun.groupBy({
      by: ["model"],
      where: { projectId, model: { not: null } },
      _count: { _all: true },
    }),
    prisma.agentRun.count({
      where: {
        projectId,
        OR: [
          { taskType: { startsWith: "QUALITY" } },
          { taskType: { contains: "QUALITY" } },
          { taskType: { startsWith: "TEST" } },
          { taskType: { startsWith: "SECURITY" } },
          { taskType: { startsWith: "ACCESSIBILITY" } },
          { taskType: { startsWith: "PERFORMANCE" } },
        ],
      },
    }),
  ]);

  if (!project) {
    throw new Error("Project not found");
  }

  const isDeleted = Boolean(project.deletedAt) || project.status === "ARCHIVED";
  const currentStartMs = currentStart.getTime();
  const runsCurrent: OverviewRunRow[] = [];
  const runsPrevious: OverviewRunRow[] = [];
  for (const r of windowRuns) {
    (r.createdAt.getTime() >= currentStartMs ? runsCurrent : runsPrevious).push(r);
  }

  const cur = aggregateWindow(runsCurrent);
  const prev = aggregateWindow(runsPrevious);

  // Per-bucket series (current display window only).
  const buckets = new Map<
    number,
    { runs: number; errors: number; tokens: number; cost: number; latencySum: number; latencyCount: number; deployments: number }
  >();
  for (const run of windowRuns) {
    const idx = window.bucket(run.createdAt);
    const b = buckets.get(idx) ?? { runs: 0, errors: 0, tokens: 0, cost: 0, latencySum: 0, latencyCount: 0, deployments: 0 };
    b.runs += 1;
    if (isError(run.status)) b.errors += 1;
    const tokens = extractTokens(run.tokenUsage);
    if (tokens != null) b.tokens += tokens;
    if (run.estimatedCost != null) b.cost += run.estimatedCost;
    if (run.startedAt && run.completedAt) {
      const ms = run.completedAt.getTime() - run.startedAt.getTime();
      if (ms >= 0) {
        b.latencySum += ms;
        b.latencyCount += 1;
      }
    }
    buckets.set(idx, b);
  }
  for (const dep of deploymentRows) {
    const idx = window.bucket(dep.createdAt);
    const b = buckets.get(idx) ?? { runs: 0, errors: 0, tokens: 0, cost: 0, latencySum: 0, latencyCount: 0, deployments: 0 };
    b.deployments += 1;
    buckets.set(idx, b);
  }

  const displayBuckets = range === "24h" ? 24 : days;
  const firstIdx =
    range === "24h"
      ? window.bucket(new Date(now.getTime() - 23 * 3_600_000))
      : window.bucket(startOfDay(now)) - (days - 1);
  const series: ProjectOverviewData["series"] = [];
  for (let i = 0; i < displayBuckets; i += 1) {
    const b = buckets.get(firstIdx + i) ?? {
      runs: 0, errors: 0, tokens: 0, cost: 0, latencySum: 0, latencyCount: 0, deployments: 0,
    };
    series.push({
      ...formatBucketDate(window.bucketDate(firstIdx + i), range),
      runs: b.runs,
      deployments: b.deployments,
      errors: b.errors,
      tokens: b.tokens,
      cost: round(b.cost),
      latencyMs: b.latencyCount > 0 ? round(b.latencySum / b.latencyCount) : null,
    });
  }

  // Setup / lifecycle
  const hasBlueprint = (project.blueprints?.length ?? 0) > 0;
  const hasDesign = project._count.design > 0;
  const hasRuns = project._count.agentRuns > 0;
  const hasQuality = qualityRuns > 0;
  const hasDeployments = project._count.deployments > 0;
  const hasActiveDeployment = Boolean(project.deployments?.[0]?.deploymentUrl);

  const setup: ProjectOverviewData["setup"] = (
    [
      { id: "blueprint", label: "Create your blueprint", href: `/projects/${project.id}/blueprint`, done: hasBlueprint },
      { id: "design", label: "Generate the design", href: `/projects/${project.id}/design`, done: hasDesign },
      { id: "build", label: "Build your application", href: `/projects/${project.id}/build`, done: hasRuns },
      { id: "quality", label: "Run quality checks", href: `/projects/${project.id}/quality`, done: hasQuality },
      { id: "deploy", label: "Deploy to an environment", href: `/projects/${project.id}/deploy`, done: hasDeployments },
    ] as { id: string; label: string; href: string; done: boolean }[]
  ).map((step, i, arr) => ({
    ...step,
    current: !step.done && arr.slice(0, i).every((s) => s.done),
  }));

  // Health
  const errors24h = windowRuns.filter(
    (r) => isError(r.status) && r.createdAt.getTime() >= now.getTime() - 86_400_000
  ).length;
  const providersConnected = providerCounts.length;
  const modelsActive = modelCounts.length;
  const hasRunning = windowRuns.some((r) => isRunning(r.status));

  let health: ProjectOverviewData["health"];
  if (isDeleted) {
    health = {
      level: "incomplete",
      title: "Project archived",
      subtitle: "This project has been archived and is no longer operational.",
    };
  } else if (errors24h > 0) {
    health = {
      level: "degraded",
      title: "Errors in the last 24 hours",
      subtitle: `${errors24h} failed ${errors24h === 1 ? "run" : "runs"} — inspect the activity below`,
    };
  } else if (pendingApprovals > 0) {
    health = {
      level: "attention",
      title: "Actions waiting on you",
      subtitle: `${pendingApprovals} pending ${pendingApprovals === 1 ? "approval" : "approvals"} need review`,
    };
  } else if (hasRunning) {
    health = {
      level: "building",
      title: "Work in progress",
      subtitle: "An AI job is currently running for this project",
    };
  } else if (hasRuns) {
    const parts: string[] = [];
    if (providersConnected > 0)
      parts.push(`${providersConnected} ${providersConnected === 1 ? "provider" : "providers"}`);
    if (modelsActive > 0)
      parts.push(`${modelsActive} active ${modelsActive === 1 ? "model" : "models"}`);
    if (openIssues > 0) parts.push(`${openIssues} open ${openIssues === 1 ? "issue" : "issues"}`);
    parts.push("no errors in the last 24h");
    health = { level: "operational", title: "All systems operational", subtitle: parts.join(" · ") };
  } else {
    health = {
      level: "incomplete",
      title: "Ready when you are",
      subtitle: hasBlueprint
        ? "Generate the design and start building this project"
        : "Create a blueprint to start building this project",
    };
  }

  // Attention — only real, actionable problems.
  const attention: ProjectOverviewData["attention"] = [];
  if (!isDeleted) {
    if (errors24h > 0 && latestRun?.errorMessage) {
      attention.push({
        severity: "error",
        title: "AI run failed",
        detail: latestRun.errorMessage,
        count: errors24h,
        lastAt: latestRun.createdAt.toISOString(),
        actionLabel: "View build",
        actionHref: `/projects/${project.id}/build`,
      });
    } else if (errors24h > 0) {
      attention.push({
        severity: "error",
        title: "Recent runs failed",
        detail: `${errors24h} failed ${errors24h === 1 ? "run" : "runs"} in the last 24 hours.`,
        count: errors24h,
        lastAt: latestRun?.createdAt.toISOString() ?? null,
        actionLabel: "View build",
        actionHref: `/projects/${project.id}/build`,
      });
    }
    if (pendingApprovals > 0) {
      attention.push({
        severity: "warning",
        title: `${pendingApprovals} ${pendingApprovals === 1 ? "approval" : "approvals"} pending`,
        detail: "Review and approve the proposed changes to continue.",
        count: pendingApprovals,
        lastAt: null,
        actionLabel: "Review approvals",
        actionHref: `/projects/${project.id}/blueprint`,
      });
    }
    if (openIssues > 0) {
      attention.push({
        severity: "warning",
        title: `${openIssues} open ${openIssues === 1 ? "issue" : "issues"}`,
        detail: "Known issues remain unresolved for this project.",
        count: openIssues,
        lastAt: null,
        actionLabel: "View quality",
        actionHref: `/projects/${project.id}/quality`,
      });
    }
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      environment: project.environment as ProjectOverviewData["project"]["environment"],
      mode: project.mode,
      status: deriveProjectStatus({
        status: project.status,
        deletedAt: project.deletedAt,
        latestRunStatus: latestRun?.status,
        hasPendingApproval: pendingApprovals > 0,
      }),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
    lifecycle: {
      hasBlueprint,
      blueprintVersion: project.blueprints?.[0]?.version ?? null,
      blueprintStatus: project.blueprints?.[0]?.status ?? null,
      hasDesign,
      hasRuns,
      hasQuality,
      hasDeployments,
      hasActiveDeployment,
    },
    setup,
    health,
    metrics: {
      runs: cur.runs,
      runsDeltaPct: pctDelta(cur.runs, prev.runs),
      tokens: cur.tokens,
      tokensDeltaPct:
        cur.tokens != null && prev.tokens != null ? pctDelta(cur.tokens, prev.tokens) : null,
      spend: cur.spend,
      spendDeltaPct:
        cur.spend != null && prev.spend != null ? pctDelta(cur.spend, prev.spend) : null,
      latencyMs: cur.latencyMs,
      latencyDeltaPct:
        cur.latencyMs != null && prev.latencyMs != null
          ? pctDelta(cur.latencyMs, prev.latencyMs)
          : null,
      errorRatePct: cur.errorRatePct,
      errorRateDeltaPct:
        cur.errorRatePct != null && prev.errorRatePct != null
          ? pctDelta(cur.errorRatePct, prev.errorRatePct)
          : null,
      requirements: project._count.requirements,
      features: project._count.features,
      deployments: project._count.deployments,
    },
    series,
    providers: cur.providers,
    models: cur.models,
    attention,
    updatedAt: now.toISOString(),
  };
}