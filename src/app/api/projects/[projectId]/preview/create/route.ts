import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getProject } from "@/server/db/projects";
import { BUILD_TASK_TYPES, IN_FLIGHT_DEPLOYMENT_STATUSES } from "@/lib/pipeline";
import {
  apiAccepted,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiInternalError,
} from "@/lib/api-response";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { projectId } = await params;

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

    // Gate: a preview only makes sense once a build has actually completed.
    const completedBuild = await prisma.agentRun.findFirst({
      where: { projectId, taskType: { in: BUILD_TASK_TYPES }, status: "COMPLETED" },
      select: { id: true },
    });
    if (!completedBuild) {
      return apiNotFound("Completed build (required before creating a preview)");
    }

    const inFlight = await prisma.deployment.findFirst({
      where: {
        projectId,
        environment: "preview",
        status: { in: IN_FLIGHT_DEPLOYMENT_STATUSES },
      },
      select: { id: true },
    });
    if (inFlight) {
      return apiAccepted({
        status: "already_in_progress",
        deploymentId: inFlight.id,
        message: "A preview deployment is already in progress.",
      });
    }

    // A real Deployment row. No URL is fabricated: it stays null until the
    // provisioning system actually assigns one.
    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        environment: "preview",
        provider: "unconfigured",
        status: "PENDING",
        deploymentUrl: null,
      },
      select: { id: true },
    });

    return apiAccepted({
      status: "queued",
      deploymentId: deployment.id,
      message: "Preview deployment queued. A URL appears once provisioning completes.",
    });
  } catch (error) {
    console.error("Error creating preview:", error);
    return apiInternalError();
  }
}