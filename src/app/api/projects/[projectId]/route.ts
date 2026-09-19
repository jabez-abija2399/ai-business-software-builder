import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getProject, updateProject, archiveProject } from "@/server/db/projects";
import { updateProjectSchema, projectIdSchema } from "@/validations/project";
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
    const validationResult = projectIdSchema.safeParse({ projectId });

    if (!validationResult.success) {
      return apiValidationError("Invalid project ID");
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

    return apiSuccess(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return apiInternalError();
  }
}

export async function PATCH(
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
    const validationResult = updateProjectSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error.flatten());
    }

    const project = await getProject(projectId);

    if (!project) {
      return apiNotFound("Project");
    }

    // Check authorization
    if (project.ownerId !== session.user.id) {
      return apiForbidden("Only the project owner can update this project");
    }

    const updated = await updateProject(projectId, validationResult.data);

    return apiSuccess(updated);
  } catch (error) {
    console.error("Error updating project:", error);
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

    // Check authorization
    if (project.ownerId !== session.user.id) {
      return apiForbidden("Only the project owner can delete this project");
    }

    await archiveProject(projectId);

    return apiNoContent();
  } catch (error) {
    console.error("Error deleting project:", error);
    return apiInternalError();
  }
}
