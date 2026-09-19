import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getProject } from "@/server/db/projects";
import { getBlueprint, updateBlueprint } from "@/server/db/blueprints";
import { clarifyBlueprintSchema } from "@/validations/blueprint";
import {
  apiSuccess,
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
    const validationResult = clarifyBlueprintSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error.flatten());
    }

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

    const blueprint = await getBlueprint(projectId);
    if (!blueprint) {
      return apiNotFound("Blueprint");
    }

    if (blueprint.status === "APPROVED") {
      return apiValidationError("Cannot clarify an approved blueprint");
    }

    // Store clarification answers
    const currentContext = (blueprint.businessContextJson as Record<string, unknown>) || {};
    const existingClarifications = (currentContext.clarifications as Array<Record<string, unknown>>) || [];

    const updatedClarifications = [
      ...existingClarifications,
      ...validationResult.data.answers.map((a) => ({
        questionId: a.questionId,
        answer: a.answer,
        timestamp: new Date().toISOString(),
      })),
    ];

    await updateBlueprint(blueprint.id, {
      businessContext: {
        ...currentContext,
        clarifications: updatedClarifications,
      },
    });

    // In production, this would trigger AI to re-analyze with new answers
    const jobId = `clarify_${Date.now()}`;

    return apiAccepted({
      jobId,
      blueprintId: blueprint.id,
      status: "processing",
      message: "Clarifications submitted. AI is re-analyzing your blueprint.",
    });
  } catch (error) {
    console.error("Error submitting clarifications:", error);
    return apiInternalError();
  }
}
