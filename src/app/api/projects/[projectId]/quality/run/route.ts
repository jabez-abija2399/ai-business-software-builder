import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getProject } from "@/server/db/projects";
import {
  BUILD_TASK_TYPES,
  QUALITY_TASK_TYPES,
  QUALITY_AGENT_TYPE,
  IN_FLIGHT_RUN_STATUSES,
} from "@/lib/pipeline";
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

    // Gate: quality checks only make sense once a build has actually completed.
    const completedBuild = await prisma.agentRun.findFirst({
      where: { projectId, taskType: { in: BUILD_TASK_TYPES }, status: "COMPLETED" },
      select: { id: true },
    });
    if (!completedBuild) {
      return apiNotFound("Completed build (required before running quality checks)");
    }

    const inFlight = await prisma.agentRun.findFirst({
      where: {
        projectId,
        taskType: { in: QUALITY_TASK_TYPES },
        status: { in: IN_FLIGHT_RUN_STATUSES },
      },
      select: { id: true },
    });
    if (inFlight) {
      return apiAccepted({
        status: "already_in_progress",
        runId: inFlight.id,
        message: "Quality checks are already queued or running.",
      });
    }

    const result = await prisma.agentRun.createMany({
      data: QUALITY_TASK_TYPES.map((taskType) => ({
        projectId,
        userId: session.user.id,
        taskType,
        agentType: QUALITY_AGENT_TYPE,
        status: "QUEUED",
      })),
    });

    try {
      const { trackAnalytics } = await import("@/server/analytics/service");
      trackAnalytics("quality_run_started", {
        distinctId: session.user.id,
        properties: { projectId, taskCount: result.count },
      });
    } catch {
      // Events must never break the response.
    }

    return apiAccepted({
      status: "queued",
      tasksCreated: result.count,
      message: "Quality checks queued. Results are written as real test records when runs complete.",
    });
  } catch (error) {
    console.error("Error running quality checks:", error);
    return apiInternalError();
  }
}