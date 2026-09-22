import prisma from "@/lib/prisma";
import { PIPELINE_TASK_TYPES, READY_DEPLOYMENT_STATUSES } from "@/lib/pipeline";
import {
  type AuditSummary,
  type DeploymentSummary,
  type PlatformMonitoring,
  type ProjectHealth,
  type RunSummary,
  type StageHealth,
} from "@/features/monitoring/types";
import { resolveAccess } from "./stage-shared";
import { reconcileVercelDeployments } from "./project-deploy";
import type { StageEditorProject } from "@/features/pipeline/types";

const FAILED_STATUSES = ["FAILED", "ERROR", "CANCELLED"];

async function accessibleProjectIds(userId: string): Promise<string[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  const members: string[] = memberships.map((m) => m.organizationId);
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      OR: [{ ownerId: userId }, { organizationId: { in: members } }],
    },
    select: { id: true },
  });
  return projects.map((p) => p.id);
}

function serializeRun(run: {
  id: string;
  projectId: string;
  taskType: string;
  agentType: string;
  status: string;
  provider: string | null;
  model: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}): RunSummary {
  const durationMs =
    run.startedAt && run.completedAt
      ? Math.max(0, run.completedAt.getTime() - run.startedAt.getTime())
      : null;
  return {
    id: run.id,
    projectId: run.projectId,
    projectName: "Unknown project",
    taskType: run.taskType,
    agentType: run.agentType,
    status: run.status,
    provider: run.provider,
    model: run.model,
    errorCode: run.errorCode,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt.toISOString(),
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    durationMs,
  };
}

function serializeDeployment(d: {
  id: string;
  projectId: string;
  environment: string;
  provider: string;
  status: string;
  deploymentUrl: string | null;
  healthStatus: string | null;
  healthCheckedAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  metadataJson: unknown;
}): DeploymentSummary {
  return {
    id: d.id,
    projectId: d.projectId,
    projectName: "Unknown project",
    environment: d.environment,
    provider: d.provider,
    status: d.status,
    deploymentUrl: d.deploymentUrl,
    healthStatus: d.healthStatus,
    healthCheckedAt: d.healthCheckedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    completedAt: d.completedAt?.toISOString() ?? null,
    metadata:
      d.metadataJson && typeof d.metadataJson === "object"
        ? (d.metadataJson as Record<string, unknown>)
        : null,
  };
}

const sumCounts = (map: Record<string, number>): number =>
  Object.values(map).reduce((acc, value) => acc + value, 0);

/** Retries a monitoring query once against transient database blips. */
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

/**
 * Platform-wide reliability data for the user's accessible scope. Everything is
 * read from real rows; nothing is estimated or synthesized.
 */
export async function getPlatformMonitoring(userId: string): Promise<PlatformMonitoring> {
  const projectIds = await accessibleProjectIds(userId);
  const scope = projectIds.length > 0 ? { projectId: { in: projectIds } } : undefined;
  const impossibleId = "00000000-0000-0000-0000-000000000000";

  const [
    runAgg,
    deployAgg,
    recentRuns,
    recentDeployments,
    recentAudit,
    failedRuns24h,
    upDeployCount,
  ] = await withRetry(() =>
    Promise.all([
      prisma.agentRun.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: scope ? { ...scope } : { id: impossibleId },
      }),
      prisma.deployment.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: scope ? { ...scope } : { id: impossibleId },
      }),
      scope
        ? prisma.agentRun.findMany({
            where: { projectId: { in: projectIds } },
            orderBy: { createdAt: "desc" },
            take: 25,
            select: {
              id: true,
              projectId: true,
              taskType: true,
              agentType: true,
              status: true,
              provider: true,
              model: true,
              errorCode: true,
              errorMessage: true,
              startedAt: true,
              completedAt: true,
              createdAt: true,
              project: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      scope
        ? prisma.deployment.findMany({
            where: { projectId: { in: projectIds } },
            orderBy: { createdAt: "desc" },
            take: 25,
            select: {
              id: true,
              projectId: true,
              environment: true,
              provider: true,
              status: true,
              deploymentUrl: true,
              healthStatus: true,
              healthCheckedAt: true,
              createdAt: true,
              completedAt: true,
              metadataJson: true,
              project: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      scope
        ? prisma.auditLog.findMany({
            where: { projectId: { in: projectIds } },
            orderBy: { createdAt: "desc" },
            take: 15,
            select: {
              id: true,
              action: true,
              entityType: true,
              projectId: true,
              createdAt: true,
              project: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      scope
        ? prisma.agentRun.count({
            where: {
              projectId: { in: projectIds },
              status: { in: FAILED_STATUSES },
              createdAt: { gte: new Date(Date.now() - 86_400_000) },
            },
          })
        : Promise.resolve(0),
      scope
        ? prisma.deployment.count({
            where: {
              projectId: { in: projectIds },
              status: { in: READY_DEPLOYMENT_STATUSES },
              healthStatus: "UP",
            },
          })
        : Promise.resolve(0),
    ])
  );

  const projectNameOf = (project: { name: string } | null): string =>
    project?.name ?? "Unknown project";

  const runsByStatus: Record<string, number> = {};
  for (const row of runAgg) runsByStatus[row.status] = row._count._all;
  const deploysByStatus: Record<string, number> = {};
  for (const row of deployAgg) deploysByStatus[row.status] = row._count._all;

  const completedRuns = recentRuns.filter(
    (r) => r.status === "COMPLETED" && r.startedAt && r.completedAt
  );
  const totalMs = completedRuns.reduce(
    (acc, r) => acc + Math.max(0, r.completedAt!.getTime() - r.startedAt!.getTime()),
    0
  );
  const avgRunDurationMs =
    completedRuns.length > 0 ? Math.round(totalMs / completedRuns.length) : null;

  return {
    summary: {
      projectCount: projectIds.length,
      runCount: sumCounts(runsByStatus),
      deployCount: sumCounts(deploysByStatus),
      runsByStatus,
      deploysByStatus,
      failedRuns24h,
      readyDeployCount: READY_DEPLOYMENT_STATUSES.reduce(
        (acc, s) => acc + (deploysByStatus[s] ?? 0),
        0
      ),
      upDeployCount,
      avgRunDurationMs,
    },
    recentRuns: recentRuns.map((run) => ({
      ...serializeRun(run),
      projectName: projectNameOf(run.project),
    })),
    recentDeployments: recentDeployments.map((deployment) => ({
      ...serializeDeployment(deployment),
      projectName: projectNameOf(deployment.project),
    })),
    recentAudit: recentAudit.map(
      (entry): AuditSummary => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        projectId: entry.projectId,
        projectName: entry.project?.name ?? null,
        createdAt: entry.createdAt.toISOString(),
      })
    ),
  };
}

/**
 * Per-project health: the last AgentRun per pipeline stage plus the latest
 * deployment per environment, with real health-check state.
 */
export async function getProjectHealth(
  projectId: string,
  userId: string
): Promise<ProjectHealth | null> {
  const access = await resolveAccess(projectId, userId);
  if (!access.accessible) return null;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      mode: true,
      environment: true,
    },
  });
  if (!project) return null;

  const [runs, deployments] = await Promise.all([
    prisma.agentRun.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        projectId: true,
        taskType: true,
        agentType: true,
        status: true,
        provider: true,
        model: true,
        errorCode: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        projectId: true,
        environment: true,
        provider: true,
        status: true,
        deploymentUrl: true,
        healthStatus: true,
        healthCheckedAt: true,
        createdAt: true,
        completedAt: true,
        metadataJson: true,
      },
    }),
  ]);

  await reconcileVercelDeployments(deployments);

  const latestByTask: Map<string, (typeof runs)[number]> = new Map();
  for (const run of runs) {
    if (!latestByTask.has(run.taskType)) latestByTask.set(run.taskType, run);
  }

  const stages: StageHealth[] = PIPELINE_TASK_TYPES.map((taskType) => {
    const run = latestByTask.get(taskType) ?? null;
    return { taskType, run: run ? serializeRun(run) : null };
  });

  const latestByEnv: Map<string, (typeof deployments)[number]> = new Map();
  for (const deployment of deployments) {
    if (!latestByEnv.has(deployment.environment))
      latestByEnv.set(deployment.environment, deployment);
  }

  const deploymentEntries = [...latestByEnv.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([environment, latestDeployment]) => {
      const full = serializeDeployment(latestDeployment);
      const { projectId: _projectId, projectName: _projectName, ...rest } = full;
      return { environment, latest: rest };
    });

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      mode: project.mode,
      environment: project.environment as StageEditorProject["environment"],
      canEdit: access.canEdit,
      isOwner: access.isOwner,
    },
    stages,
    deployments: deploymentEntries,
  };
}