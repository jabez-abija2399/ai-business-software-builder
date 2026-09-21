import prisma from "@/lib/prisma";
import { READY_DEPLOYMENT_STATUSES } from "@/lib/pipeline";
import { type StageEditorProject, resolveAccess } from "./stage-shared";

export interface DeployDeployment {
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

export interface DeployEditorData {
  project: StageEditorProject;
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  /** Gate: deployment requires at least one completed preview. */
  hasCompletedPreview: boolean;
  /** Real non-preview deployments (staging / production). */
  deployments: DeployDeployment[];
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
}): DeployDeployment {
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
 * Loads everything the Deploy screen needs. Deployments are real Deployment
 * rows; a URL is only shown when the provisioning system actually wrote one.
 */
export async function getDeployEditorData(
  projectId: string,
  userId: string
): Promise<DeployEditorData | null> {
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

  const [preview, deployments] = await prisma.$transaction([
    prisma.deployment.findFirst({
      where: {
        projectId,
        environment: "preview",
        status: { in: READY_DEPLOYMENT_STATUSES },
      },
      select: { id: true },
    }),
    prisma.deployment.findMany({
      where: { projectId, environment: { not: "preview" } },
      orderBy: [{ environment: "asc" }, { createdAt: "asc" }],
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
    hasCompletedPreview: preview != null,
    deployments: deployments.map(serializeDeployment),
  };
}