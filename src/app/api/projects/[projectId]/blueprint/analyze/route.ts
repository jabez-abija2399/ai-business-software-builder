import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getProject } from "@/server/db/projects";
import {
  createBlueprint,
  getLatestApprovedBlueprint,
  getBlueprint,
  updateBlueprint,
} from "@/server/db/blueprints";
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

    // Reuse the latest un-approved draft so retries don't create version spam;
    // otherwise create the first draft for this project.
    const latest = await getBlueprint(projectId);
    const draft = latest && latest.status !== "APPROVED" ? latest : null;
    const context = {
      rawDescription: validationResult.data.businessDescription,
      constraints: validationResult.data.constraints,
    };
    const blueprint =
      draft ??
      (await createBlueprint({
        projectId,
        createdBy: session.user.id,
        businessContext: context,
      }));

    if (draft) {
      await updateBlueprint(blueprint.id, { businessContext: context });
    }

    // Record the analysis as a real AgentRun so the Overview activity stream
    // and metrics reflect actual work (never a fabricated job id).
    const run = await prisma.agentRun.create({
      data: {
        projectId,
        userId: session.user.id,
        taskType: "BLUEPRINT_ANALYSIS",
        agentType: "BLUEPRINT_ANALYST",
        status: "QUEUED",
      },
      select: { id: true },
    });

    return apiAccepted({
      status: "queued",
      runId: run.id,
      blueprintId: blueprint.id,
      version: blueprint.version,
    });
  } catch (error) {
    console.error("Error analyzing blueprint:", error);
    return apiInternalError();
  }
}
