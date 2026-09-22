import prisma from "@/lib/prisma";
import { READY_DEPLOYMENT_STATUSES, PIPELINE_TASK_TYPES } from "@/lib/pipeline";
import type { UsageAnalytics } from "@/features/usage/types";
import { accessibleProjectIds } from "./monitoring";

const FAILED_STATUSES = ["FAILED", "ERROR", "CANCELLED"];

const DAY_MS = 86_400_000;

/** Retries a usage query once against transient database blips. */
async function withRetry<T>(run: () => Promise<T>, attempts = 2): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const retriable =
        error instanceof Error &&
        /P1001|Can't reach database server|Connection timed out/i.test(error.message);
      if (!retriable || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * First-party usage analytics. Every number is computed from real rows within
 * the user's accessible scope (own projects + projects of organizations they
 * belong to). Nothing is estimated, sampled, or synthesized.
 */
export async function getUsageAnalytics(userId: string): Promise<UsageAnalytics> {
  const projectIds = await accessibleProjectIds(userId);
  const scope = projectIds.length > 0 ? { projectId: { in: projectIds } } : undefined;
  const impossibleId = "00000000-0000-0000-0000-000000000000";

  if (!scope) {
    return {
      summary: {
        projectCount: 0,
        runCount: 0,
        deployCount: 0,
        completedRunCount: 0,
        avgRunDurationMs: null,
        readyDeployCount: 0,
      },
      activity: [],
      runsByStage: [],
      runsByStatus: {},
      deploysByEnvironment: {},
      topProjects: [],
      enabledDaysAgo: 14,
    };
  }

  const [runAgg, deployAgg, runStageAgg, recentRunRows, recentDeployRows, recentProjectRows, completedRows, readyCount] =
    await withRetry(() =>
      Promise.all([
        prisma.agentRun.groupBy({
          by: ["status"],
          _count: { _all: true },
          where: scope,
        }),
        prisma.deployment.groupBy({
          by: ["environment"],
          _count: { _all: true },
          where: scope,
        }),
        prisma.agentRun.groupBy({
          by: ["taskType", "status"],
          _count: { _all: true },
          where: scope,
        }),
        prisma.agentRun.findMany({
          where: { ...scope, createdAt: { gte: new Date(Date.now() - 14 * DAY_MS) } },
          select: { createdAt: true, taskType: true, status: true },
        }),
        prisma.deployment.findMany({
          where: { ...scope, createdAt: { gte: new Date(Date.now() - 14 * DAY_MS) } },
          select: { createdAt: true, environment: true },
        }),
        prisma.project.findMany({
          where: {
            deletedAt: null,
            id: { in: projectIds },
            createdAt: { gte: new Date(Date.now() - 14 * DAY_MS) },
          },
          select: { createdAt: true },
        }),
        prisma.agentRun.findMany({
          where: { ...scope, status: "COMPLETED", startedAt: { not: null }, completedAt: { not: null } },
          select: { taskType: true, startedAt: true, completedAt: true },
        }),
        prisma.deployment.count({
          where: { ...scope, status: { in: READY_DEPLOYMENT_STATUSES } },
        }),
      ])
    );

  const readyDeployCount = readyCount;

  const byStatus: Record<string, number> = {};
  for (const row of runAgg) byStatus[row.status] = row._count._all;
  const byEnvironment: Record<string, number> = {};
  for (const row of deployAgg) byEnvironment[row.environment] = row._count._all;

  const stageStats = new Map<string, { count: number; completed: number; failed: number; totalMs: number }>();
  for (const row of runStageAgg) {
    const entry = stageStats.get(row.taskType) ?? { count: 0, completed: 0, failed: 0, totalMs: 0 };
    entry.count += row._count._all;
    if (row.status === "COMPLETED") entry.completed += row._count._all;
    if (FAILED_STATUSES.includes(row.status)) entry.failed += row._count._all;
    stageStats.set(row.taskType, entry);
  }
  for (const run of completedRows) {
    if (!run.startedAt || !run.completedAt) continue;
    const entry = stageStats.get(run.taskType) ?? { count: 0, completed: 0, failed: 0, totalMs: 0 };
    entry.totalMs += Math.max(0, run.completedAt.getTime() - run.startedAt.getTime());
    stageStats.set(run.taskType, entry);
  }

  const runsByStage = [...new Set([...PIPELINE_TASK_TYPES, ...stageStats.keys()])]
    .map((taskType) => {
      const stat = stageStats.get(taskType);
      const totalMs = stat?.totalMs ?? 0;
      const completed = stat?.completed ?? 0;
      return {
        taskType,
        count: stat?.count ?? 0,
        completed,
        failed: stat?.failed ?? 0,
        avgDurationMs: completed > 0 ? Math.round(totalMs / completed) : null,
      };
    })
    .filter((stage) => stage.count > 0)
    .sort((a, b) => b.count - a.count);

  const activity = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(Date.now() - (13 - index) * DAY_MS);
    const key = utcDayKey(day);
    return {
      date: key,
      label: key.slice(5),
      runs: recentRunRows.filter((r) => utcDayKey(r.createdAt) === key).length,
      deploys: recentDeployRows.filter((d) => utcDayKey(d.createdAt) === key).length,
      projects: recentProjectRows.filter((p) => utcDayKey(p.createdAt) === key).length,
    };
  });

  const totalMs = completedRows.reduce(
    (acc, r) =>
      acc +
      (r.startedAt && r.completedAt
        ? Math.max(0, r.completedAt.getTime() - r.startedAt.getTime())
        : 0),
    0
  );
  const avgRunDurationMs = completedRows.length > 0 ? Math.round(totalMs / completedRows.length) : null;

  const topProjects = await prisma.agentRun
    .groupBy({
      by: ["projectId"],
      _count: { _all: true },
      where: scope,
      orderBy: { _count: { projectId: "desc" } },
      take: 5,
    })
    .then(async (grouped) => {
      const names = await prisma.project.findMany({
        where: { id: { in: grouped.map((g) => g.projectId) } },
        select: { id: true, name: true },
      });
      const nameById = new Map(names.map((p) => [p.id, p.name]));
      return grouped.map((g) => ({
        id: g.projectId,
        name: nameById.get(g.projectId) ?? "Deleted project",
        runCount: g._count._all,
      }));
    });

  return {
    summary: {
      projectCount: projectIds.length,
      runCount: Object.values(byStatus).reduce((acc, v) => acc + v, 0),
      deployCount: Object.values(byEnvironment).reduce((acc, v) => acc + v, 0),
      completedRunCount: completedRows.length,
      avgRunDurationMs,
      readyDeployCount,
    },
    activity,
    runsByStage,
    runsByStatus: byStatus,
    deploysByEnvironment: byEnvironment,
    topProjects,
    enabledDaysAgo: 14,
  };
}