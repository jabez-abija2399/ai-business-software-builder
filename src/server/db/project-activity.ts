import prisma from "@/lib/prisma";
import type { ProjectActivityData } from "@/features/project-detail/types";

const RUN_STATUS_LABELS: Record<string, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  IN_PROGRESS: "Running",
  COMPLETED: "Completed",
  SUCCESS: "Completed",
  FAILED: "Failed",
  ERROR: "Failed",
  CANCELLED: "Cancelled",
};

function humanizeLabel(status: string, map: Record<string, string>) {
  return map[status] ?? status.charAt(0) + status.slice(1).toLowerCase();
}

/**
 * Recent cross-entity activity for a project (runs, deployments, approvals,
 * decisions) merged into a single chronological stream. Serves the Overview's
 * "Recent activity" section and keeps the shell honest about what the system
 * actually knows.
 */
export async function getProjectActivity(
  projectId: string,
  limit = 12
): Promise<ProjectActivityData> {
  const [runs, deployments, approvals, decisions] = await Promise.all([
    prisma.agentRun.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        taskType: true,
        agentType: true,
        status: true,
        model: true,
        createdAt: true,
      },
    }),
    prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, environment: true, provider: true, status: true, createdAt: true },
    }),
    prisma.approval.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, actionType: true, riskLevel: true, status: true, createdAt: true },
    }),
    prisma.decision.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, decisionKey: true, status: true, createdAt: true },
    }),
  ]);

  const items: ProjectActivityData["items"] = [
    ...runs.map((r) => ({
      id: r.id,
      type: "run" as const,
      title: r.taskType.replace(/_/g, " ").toLowerCase(),
      subtitle: [r.agentType.replace(/_/g, " ").toLowerCase(), r.model].filter(Boolean).join(" · "),
      status: humanizeLabel(r.status, RUN_STATUS_LABELS),
      at: r.createdAt.toISOString(),
      href: `/projects/${projectId}/build`,
    })),
    ...deployments.map((d) => ({
      id: d.id,
      type: "deployment" as const,
      title: `Deployment · ${d.environment.toLowerCase()}`,
      subtitle: d.provider,
      status: humanizeLabel(d.status, {}),
      at: d.createdAt.toISOString(),
      href: `/projects/${projectId}/deploy`,
    })),
    ...approvals.map((a) => ({
      id: a.id,
      type: "approval" as const,
      title: `${a.actionType.replace(/_/g, " ").toLowerCase()} approval`,
      subtitle: `Risk: ${a.riskLevel.toLowerCase()}`,
      status: humanizeLabel(a.status, {}),
      at: a.createdAt.toISOString(),
      href: `/projects/${projectId}/blueprint`,
    })),
    ...decisions.map((d) => ({
      id: d.id,
      type: "decision" as const,
      title: d.title,
      subtitle: d.decisionKey,
      status: humanizeLabel(d.status, {}),
      at: d.createdAt.toISOString(),
      href: `/projects/${projectId}/design`,
    })),
  ];

  items.sort((a, b) => (a.at < b.at ? 1 : -1));

  return {
    items: items.slice(0, limit),
    total: items.length,
    updatedAt: new Date().toISOString(),
  };
}