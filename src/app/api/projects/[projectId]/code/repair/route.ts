import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getProject } from "@/server/db/projects";
import { getLatestApprovedBlueprint } from "@/server/db/blueprints";
import { BUILD_AGENT_TYPE, BUILD_TASK_TYPES, FAILED_RUN_STATUSES, IN_FLIGHT_RUN_STATUSES } from "@/lib/pipeline";
import {
  apiAccepted,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiConflict,
  apiInternalError,
} from "@/lib/api-response";

/**
 * Repair loop (Phase 3): re-queues genuine work for each failed build task so
 * the worker re-evaluates or regenerates it. INSTALL_DEPENDENCIES is exempt —
 * it fails because no network sandbox exists here, not because of the task
 * itself. Uses the same real AgentRun machinery as the rest of the pipeline.
 */
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
        where: { userId: session.user.id, organizationId: project.organizationId },
        select: { id: true },
      });
      if (!membership) return apiForbidden();
    }

    const blueprint = await getLatestApprovedBlueprint(projectId);
    if (!blueprint) {
      return apiNotFound("Approved blueprint (required before rebuilding)");
    }

    const inFlight = await prisma.agentRun.findFirst({
      where: {
        projectId,
        taskType: { in: BUILD_TASK_TYPES },
        status: { in: IN_FLIGHT_RUN_STATUSES },
      },
      select: { id: true },
    });
    if (inFlight) {
      return apiConflict("A build task is already queued or running. Wait for it to finish.");
    }

    const failed = await prisma.agentRun.findMany({
      where: {
        projectId,
        taskType: { in: BUILD_TASK_TYPES },
        status: { in: FAILED_RUN_STATUSES },
      },
      select: { taskType: true },
    });

    const taskTypes = Array.from(
      new Set(failed.map((r) => r.taskType).filter((t) => t !== "INSTALL_DEPENDENCIES"))
    );
    taskTypes.sort();

    if (taskTypes.length === 0) {
      return apiAccepted({
        status: "nothing_to_repair",
        tasksCreated: 0,
        message: "No failed build tasks to repair.",
      });
    }

    const result = await prisma.agentRun.createMany({
      data: taskTypes.map((taskType) => ({
        projectId,
        userId: session.user.id,
        taskType,
        agentType: BUILD_AGENT_TYPE,
        status: "QUEUED",
        inputArtifactVersion: blueprint.version,
      })),
    });

    return apiAccepted({
      status: "queued",
      tasksCreated: result.count,
      taskTypes,
      message: `Repair queued ${result.count} task(s): ${taskTypes.join(", ")}.`,
    });
  } catch (error) {
    console.error("Error repairing build:", error);
    return apiInternalError();
  }
}