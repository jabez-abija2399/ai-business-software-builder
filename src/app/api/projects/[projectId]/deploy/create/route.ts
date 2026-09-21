import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getProject } from "@/server/db/projects";
import { READY_DEPLOYMENT_STATUSES, IN_FLIGHT_DEPLOYMENT_STATUSES } from "@/lib/pipeline";
import { createDeploymentSchema } from "@/validations/pipeline";
import {
  apiAccepted,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiValidationError,
  apiInternalError,
} from "@/lib/api-response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { projectId } = await params;

    const bodyResult = createDeploymentSchema.safeParse(await request.json());
    if (!bodyResult.success) {
      return apiValidationError(bodyResult.error.flatten());
    }
    const environment = bodyResult.data.environment;

    const project = await getProject(projectId);
    if (!project) {
      return apiNotFound("Project");
    }

    if (project.ownerId !== session.user.id) {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: session.user.id,
          organizationId: project.organizationId,
        },
        select: { id: true },
      });
      if (!membership) return apiForbidden();
    }

    // Gate: deploy only makes sense once a preview environment has completed.
    const completedPreview = await prisma.deployment.findFirst({
      where: {
        projectId,
        environment: "preview",
        status: { in: READY_DEPLOYMENT_STATUSES },
      },
      select: { id: true },
    });
    if (!completedPreview) {
      return apiNotFound("Completed preview (required before deploying)");
    }

    const inFlight = await prisma.deployment.findFirst({
      where: {
        projectId,
        environment,
        status: { in: IN_FLIGHT_DEPLOYMENT_STATUSES },
      },
      select: { id: true },
    });
    if (inFlight) {
      return apiAccepted({
        status: "already_in_progress",
        deploymentId: inFlight.id,
        message: `A ${environment} deployment is already in progress.`,
      });
    }

    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        environment,
        provider: "unconfigured",
        status: "PENDING",
        deploymentUrl: null,
      },
      select: { id: true },
    });

    return apiAccepted({
      status: "queued",
      deploymentId: deployment.id,
      environment,
      message: `${environment} deployment queued. A URL appears once provisioning completes.`,
    });
  } catch (error) {
    console.error("Error creating deployment:", error);
    return apiInternalError();
  }
}