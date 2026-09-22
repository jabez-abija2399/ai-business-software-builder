import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiConflict,
  apiInternalError,
} from "@/lib/api-response";
import { READY_DEPLOYMENT_STATUSES } from "@/lib/pipeline";
import { checkDeploymentById } from "@/server/monitoring/healthchecks";

/**
 * Trigger a real health check against a READY deployment right now. The probe
 * genuinely fetches the deployment URL; the result is the actual outcome.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; deploymentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { projectId, deploymentId } = await params;

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { id: true, projectId: true, status: true, deploymentUrl: true },
    });
    if (!deployment || deployment.projectId !== projectId) {
      return apiNotFound("Deployment");
    }

    if (deployment.deploymentUrl?.startsWith("/")) {
      return apiConflict(
        "Preview endpoints require a browser session and cannot be health-checked externally. Health checks apply to deployed staging/production URLs."
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, organizationId: true },
    });
    if (!project) return apiNotFound("Project");
    if (project.ownerId !== session.user.id) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id, organizationId: project.organizationId },
        select: { id: true },
      });
      if (!membership) return apiForbidden();
    }

    if (!READY_DEPLOYMENT_STATUSES.includes(deployment.status)) {
      return apiConflict(
        `Only a READY deployment can be health-checked (this one is ${deployment.status}).`
      );
    }

    const result = await checkDeploymentById(deploymentId);
    if (!result) return apiNotFound("Deployment");

    return apiSuccess({ result });
  } catch (error) {
    console.error("Error running health check:", error);
    return apiInternalError();
  }
}