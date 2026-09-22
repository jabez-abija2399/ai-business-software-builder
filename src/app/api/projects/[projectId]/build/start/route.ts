import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getProject } from "@/server/db/projects";
import { getLatestApprovedBlueprint } from "@/server/db/blueprints";
import { BUILD_TASK_TYPES, BUILD_AGENT_TYPE, IN_FLIGHT_RUN_STATUSES } from "@/lib/pipeline";
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

    const blueprint = await getLatestApprovedBlueprint(projectId);
    if (!blueprint) {
      return apiNotFound("Approved blueprint (required before building)");
    }

    // Single queue slot for the pipeline: never fabricate a job id.
    const inFlight = await prisma.agentRun.findFirst({
      where: {
        projectId,
        taskType: { in: BUILD_TASK_TYPES },
        status: { in: IN_FLIGHT_RUN_STATUSES },
      },
      select: { id: true },
    });
    if (inFlight) {
      return apiAccepted({
        status: "already_in_progress",
        runId: inFlight.id,
        message: "A build is already queued or running.",
      });
    }

    const result = await prisma.agentRun.createMany({
      data: BUILD_TASK_TYPES.map((taskType) => ({
        projectId,
        userId: session.user.id,
        taskType,
        agentType: BUILD_AGENT_TYPE,
        status: "QUEUED",
        inputArtifactVersion: blueprint.version,
      })),
    });

    try {
      const { trackAnalytics } = await import("@/server/analytics/service");
      trackAnalytics("build_started", {
        distinctId: session.user.id,
        properties: { projectId, taskCount: result.count },
      });
    } catch {
      // Events must never break the response.
    }

    return apiAccepted({
      status: "queued",
      tasksCreated: result.count,
      message: "Build pipeline queued. Each task runs as a real Fleet agent.",
    });
  } catch (error) {
    console.error("Error starting build:", error);
    return apiInternalError();
  }
}