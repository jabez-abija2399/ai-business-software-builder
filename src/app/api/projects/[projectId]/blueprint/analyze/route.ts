import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getProject } from "@/server/db/projects";
import { createBlueprint, getLatestApprovedBlueprint } from "@/server/db/blueprints";
import { analyzeBlueprintSchema } from "@/validations/blueprint";
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
    const body = await request.json();
    const validationResult = analyzeBlueprintSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error.flatten());
    }

    const project = await getProject(projectId);

    if (!project) {
      return apiNotFound("Project");
    }

    // Check authorization
    if (project.ownerId !== session.user.id) {
      const membership = await import("@/lib/prisma").then((m) =>
        m.default.organizationMember.findFirst({
          where: {
            userId: session.user.id,
            organizationId: project.organizationId,
          },
        })
      );

      if (!membership) {
        return apiForbidden();
      }
    }

    // Check if blueprint already approved
    const existingBlueprint = await getLatestApprovedBlueprint(projectId);
    if (existingBlueprint) {
      return apiAccepted({
        status: "already_approved",
        blueprintId: existingBlueprint.id,
        version: existingBlueprint.version,
        message: "Blueprint already approved. Use PUT to update instead.",
      });
    }

    // Create initial blueprint draft
    const blueprint = await createBlueprint({
      projectId,
      createdBy: session.user.id,
      businessContext: {
        rawDescription: validationResult.data.businessDescription,
        constraints: validationResult.data.constraints,
      },
    });

    // In production, this would start an AI agent job
    // For now, return the blueprint with a simulated job
    const jobId = `job_${Date.now()}`;

    return apiAccepted({
      jobId,
      blueprintId: blueprint.id,
      status: "queued",
      estimatedDurationSeconds: 120,
      websocketUrl: `wss://api.example.com/ws/jobs/${jobId}`,
    });
  } catch (error) {
    console.error("Error analyzing blueprint:", error);
    return apiInternalError();
  }
}
