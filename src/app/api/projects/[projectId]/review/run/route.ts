import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getProject } from "@/server/db/projects";
import {
  BUILD_TASK_TYPES,
  REVIEW_TASK_TYPES,
  REVIEW_AGENT_TYPE,
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

    // Gate: review agents work on the real generated files, so a completed
    // build is required.
    const completedBuild = await prisma.agentRun.findFirst({
      where: { projectId, taskType: { in: BUILD_TASK_TYPES }, status: "COMPLETED" },
      select: { id: true },
    });
    if (!completedBuild) {
      return apiNotFound("Completed build (required before running review agents)");
    }

    const inFlight = await prisma.agentRun.findFirst({
      where: {
        projectId,
        taskType: { in: REVIEW_TASK_TYPES },
        status: { in: IN_FLIGHT_RUN_STATUSES },
      },
      select: { id: true },
    });
    if (inFlight) {
      return apiAccepted({
        status: "already_in_progress",
        runId: inFlight.id,
        message: "Review agents are already queued or running.",
      });
    }

    const result = await prisma.agentRun.createMany({
      data: REVIEW_TASK_TYPES.map((taskType) => ({
        projectId,
        userId: session.user.id,
        taskType,
        agentType: REVIEW_AGENT_TYPE,
        status: "QUEUED",
      })),
    });

    try {
      const { trackAnalytics } = await import("@/server/analytics/service");
      trackAnalytics("review_run_started", {
        distinctId: session.user.id,
        properties: { projectId, taskCount: result.count },
      });
    } catch {
      // Events must never break the response.
    }

    return apiAccepted({
      status: "queued",
      tasksCreated: result.count,
      message: "Review agents queued. The README and review report are written when they complete.",
    });
  } catch (error) {
    console.error("Error running review agents:", error);
    return apiInternalError();
  }
}