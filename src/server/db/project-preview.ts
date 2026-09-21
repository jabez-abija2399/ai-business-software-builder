import prisma from "@/lib/prisma";
import { BUILD_TASK_TYPES } from "@/lib/pipeline";
import { type StageEditorProject, resolveAccess } from "./stage-shared";

export interface PreviewDeployment {
  id: string;
  environment: string;
  provider: string;
  status: string;
  commitRef: string | null;
  deploymentUrl: string | null;
  healthStatus: string | null;
  createdAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface PreviewEditorData {
  project: StageEditorProject;
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  /** Gate: a preview requires at least one completed build run. */
  hasCompletedBuild: boolean;
  /** Latest real preview deployment (environment = "preview"). */
  latestPreview: PreviewDeployment | null;
  /** Full real preview deployment history. */
  previewHistory: PreviewDeployment[];
}

function serializeDeployment(d: {
  id: string;
  environment: string;
  provider: string;
  status: string;
  commitRef: string | null;
  deploymentUrl: string | null;
  healthStatus: string | null;
  createdAt: Date;
  completedAt: Date | null;
  metadataJson: unknown;
}): PreviewDeployment {
  return {
    id: d.id,
    environment: d.environment,
    provider: d.provider,
    status: d.status,
    commitRef: d.commitRef,
    deploymentUrl: d.deploymentUrl,
    healthStatus: d.healthStatus,
    createdAt: d.createdAt.toISOString(),
    completedAt: d.completedAt?.toISOString() ?? null,
    metadata:
      d.metadataJson && typeof d.metadataJson === "object"
        ? (d.metadataJson as Record<string, unknown>)
        : null,
  };
}

/**
 * Loads everything the Preview screen needs. A preview is a real Deployment
 * row; its status and URL are whatever the provisioning system actually
 * persisted — the screen never invents a `*.vercel.app` address.
 */
export async function getPreviewEditorData(
  projectId: string,
  userId: string
): Promise<PreviewEditorData | null> {
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
      blueprints: {
        orderBy: { version: "desc" },
        select: { id: true, version: true, status: true, approvedAt: true },
      },
    },
  });

  if (!project) return null;

  const [buildRun, previews] = await prisma.$transaction([
    prisma.agentRun.findFirst({
      where: { projectId, taskType: { in: BUILD_TASK_TYPES }, status: "COMPLETED" },
      select: { id: true },
    }),
    prisma.deployment.findMany({
      where: { projectId, environment: "preview" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const blueprint = project.blueprints.find((b) => b.status === "APPROVED") ?? null;

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      mode: project.mode,
      environment: project.environment,
      canEdit: access.canEdit,
      isOwner: access.isOwner,
    },
    blueprint: blueprint
      ? {
          id: blueprint.id,
          version: blueprint.version,
          status: blueprint.status,
          approvedAt: blueprint.approvedAt?.toISOString() ?? null,
        }
      : null,
    hasCompletedBuild: buildRun != null,
    latestPreview: previews[0] ? serializeDeployment(previews[0]) : null,
    previewHistory: previews.map(serializeDeployment),
  };
}