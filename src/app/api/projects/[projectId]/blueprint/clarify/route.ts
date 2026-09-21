import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getProject } from "@/server/db/projects";
import { getBlueprint, updateBlueprint } from "@/server/db/blueprints";
import { clarifyBlueprintSchema } from "@/validations/blueprint";
import {
  apiSuccess,
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

    // Clarification answers live on the real draft; question IDs come from
    // pendingQuestions so the loop reconciles with persisted state.
    const currentContext = (blueprint.businessContextJson as Record<string, unknown>) || {};
    const existingClarifications = Array.isArray(currentContext.clarifications)
      ? (currentContext.clarifications as Array<Record<string, unknown>>)
      : [];
    const existingPending = Array.isArray(currentContext.pendingQuestions)
      ? (currentContext.pendingQuestions as Array<Record<string, unknown>>)
      : [];

    const answeredIds = new Set(validationResult.data.answers.map((a) => a.questionId));

    const updatedClarifications = [
      ...existingClarifications,
      ...validationResult.data.answers.map((a) => ({
        questionId: a.questionId,
        answer: a.answer,
        timestamp: new Date().toISOString(),
      })),
    ];

    const remainingPending = existingPending.filter(
      (q) => !answeredIds.has(String(q.id))
    );

    await updateBlueprint(blueprint.id, {
      businessContext: {
        ...currentContext,
        clarifications: updatedClarifications,
        ...(remainingPending.length > 0 ? { pendingQuestions: remainingPending } : {}),
      },
    });

    return apiSuccess({
      blueprintId: blueprint.id,
      version: blueprint.version,
      answered: validationResult.data.answers.length,
      pending: remainingPending.length,
      message:
        remainingPending.length > 0
          ? "Answer submitted."
          : "All clarification answers submitted.",
    });
  } catch (error) {
    console.error("Error submitting clarifications:", error);
    return apiInternalError();
  }
}
