import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getProject } from "@/server/db/projects";
import { getLatestApprovedBlueprint } from "@/server/db/blueprints";
import {
  apiAccepted,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
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

    const blueprint = await getLatestApprovedBlueprint(projectId);
    if (!blueprint) {
      return apiNotFound("Approved blueprint (required before generating design)");
    }

    // Check for existing in-progress design
    const existingDesign = await import("@/lib/prisma").then((m) =>
      m.default.designArtifact.findFirst({
        where: {
          projectId,
          status: { in: ["QUEUED", "GENERATING"] },
        },
      })
    );

    if (existingDesign) {
      return apiAccepted({
        status: "already_in_progress",
        designId: existingDesign.id,
        message: "Design generation already in progress.",
      });
    }

    // Create design record
    const design = await import("@/lib/prisma").then((m) =>
      m.default.designArtifact.create({
        data: {
          projectId,
          version: 1,
          status: "QUEUED",
        },
      })
    );

    // In production, this would start an AI agent job
    const jobId = `design_${Date.now()}`;

    return apiAccepted({
      jobId,
      designId: design.id,
      status: "queued",
      estimatedDurationSeconds: 180,
      websocketUrl: `wss://api.example.com/ws/jobs/${jobId}`,
    });
  } catch (error) {
    console.error("Error generating design:", error);
    return apiInternalError();
  }
}
