import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getProject } from "@/server/db/projects";
import { getLatestApprovedBlueprint } from "@/server/db/blueprints";
import { DESIGN_TASK_TYPES, DESIGN_AGENT_TYPE, IN_FLIGHT_RUN_STATUSES } from "@/lib/pipeline";
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
      return apiNotFound("Approved blueprint (required before generating design)");
    }

    // A single real queue slot per action: never a fabricated job id.
    const inFlight = await prisma.agentRun.findFirst({
      where: {
        projectId,
        taskType: { in: DESIGN_TASK_TYPES },
        status: { in: IN_FLIGHT_RUN_STATUSES },
      },
      select: { id: true },
    });
    if (inFlight) {
      return apiAccepted({
        status: "already_in_progress",
        runId: inFlight.id,
        message: "Design generation is already queued or running.",
      });
    }

    const run = await prisma.agentRun.create({
      data: {
        projectId,
        userId: session.user.id,
        taskType: DESIGN_TASK_TYPES[0],
        agentType: DESIGN_AGENT_TYPE,
        status: "QUEUED",
        inputArtifactVersion: blueprint.version,
      },
      select: { id: true },
    });

    try {
      const { trackAnalytics } = await import("@/server/analytics/service");
      trackAnalytics("design_generated", {
        distinctId: session.user.id,
        properties: { projectId, runId: run.id },
      });
    } catch {
      // Events must never break the response.
    }

    return apiAccepted({
      status: "queued",
      runId: run.id,
      message: "Design generation queued. The design artifact is written when the run completes.",
    });
  } catch (error) {
    console.error("Error generating design:", error);
    return apiInternalError();
  }
}