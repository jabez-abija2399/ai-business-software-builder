import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getProject } from "@/server/db/projects";
import { getBlueprint, approveBlueprint } from "@/server/db/blueprints";
import {
  apiSuccess,
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
      return apiForbidden("Only the project owner can approve the blueprint");
    }

    const blueprint = await getBlueprint(projectId);
    if (!blueprint) {
      return apiNotFound("Blueprint");
    }

    if (blueprint.status === "APPROVED") {
      return apiSuccess({
        status: "already_approved",
        blueprintId: blueprint.id,
      });
    }

    const approved = await approveBlueprint(blueprint.id, session.user.id);
    return apiSuccess(approved);
  } catch (error) {
    console.error("Error approving blueprint:", error);
    return apiInternalError();
  }
}
