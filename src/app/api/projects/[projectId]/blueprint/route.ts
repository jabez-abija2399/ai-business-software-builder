import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getProject } from "@/server/db/projects";
import { getBlueprint, updateBlueprint, approveBlueprint } from "@/server/db/blueprints";
import { updateBlueprintSchema } from "@/validations/blueprint";
import {
  apiSuccess,
  apiNoContent,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiValidationError,
  apiInternalError,
} from "@/lib/api-response";

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version")
      ? parseInt(searchParams.get("version")!)
      : undefined;

    const blueprint = await getBlueprint(projectId, version);

    if (!blueprint) {
      return apiSuccess(null);
    }

    return apiSuccess(blueprint);
  } catch (error) {
    console.error("Error fetching blueprint:", error);
    return apiInternalError();
  }
}

export async function PUT(
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
    const validationResult = updateBlueprintSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error.flatten());
    }

    const project = await getProject(projectId);
    if (!project) {
      return apiNotFound("Project");
    }

    if (project.ownerId !== session.user.id) {
      return apiForbidden("Only the project owner can update the blueprint");
    }

    const blueprint = await getBlueprint(projectId);
    if (!blueprint) {
      return apiNotFound("Blueprint");
    }

    const updated = await updateBlueprint(blueprint.id, validationResult.data);
    return apiSuccess(updated);
  } catch (error) {
    console.error("Error updating blueprint:", error);
    return apiInternalError();
  }
}

export async function DELETE(
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
      return apiForbidden("Only the project owner can delete the blueprint");
    }

    const blueprint = await getBlueprint(projectId);
    if (!blueprint) {
      return apiNotFound("Blueprint");
    }

    if (blueprint.status === "APPROVED") {
      return apiValidationError("Cannot delete an approved blueprint");
    }

    await import("@/lib/prisma").then((m) =>
      m.default.businessBlueprint.delete({ where: { id: blueprint.id } })
    );

    return apiNoContent();
  } catch (error) {
    console.error("Error deleting blueprint:", error);
    return apiInternalError();
  }
}
