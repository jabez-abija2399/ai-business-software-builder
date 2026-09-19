import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getProject } from "@/server/db/projects";
import {
  apiAccepted,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiInternalError,
} from "@/lib/api-response";

const QUALITY_CHECK_TYPES = ["TESTS", "SECURITY", "ACCESSIBILITY", "PERFORMANCE"];

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

    const project = await getProject(projectId);
    if (!project) {
      return apiNotFound("Project");
    }

    if (project.ownerId !== session.user.id) {
      const membership = await import("@/lib/prisma").then((m) =>
        m.default.organizationMember.findFirst({
          where: {
            userId: session.user.id,
            organizationId: project.organizationId,
          },
        })
      );
      if (!membership) return apiForbidden();
    }

    // Check for existing in-progress quality check
    const existingCheck = await import("@/lib/prisma").then((m) =>
      m.default.agentRun.findFirst({
        where: {
          projectId,
          taskType: { in: QUALITY_CHECK_TYPES },
          status: { in: ["QUEUED", "IN_PROGRESS"] },
        },
      })
    );

    if (existingCheck) {
      return apiAccepted({
        status: "already_in_progress",
        runId: existingCheck.id,
        message: "Quality check already in progress.",
      });
    }

    // Create quality check tasks
    const tasks = await import("@/lib/prisma").then((m) =>
      m.default.agentRun.createMany({
        data: QUALITY_CHECK_TYPES.map((taskType) => ({
          projectId,
          taskType,
          agentType: "QUALITY_CHECK",
          status: "QUEUED",
          userId: session.user.id,
        })),
      })
    );

    // In production, this would start quality check agents
    const jobId = `quality_${Date.now()}`;

    return apiAccepted({
      jobId,
      tasksCreated: tasks.count,
      status: "queued",
      estimatedDurationSeconds: 120,
      websocketUrl: `wss://api.example.com/ws/jobs/${jobId}`,
    });
  } catch (error) {
    console.error("Error running quality checks:", error);
    return apiInternalError();
  }
}
