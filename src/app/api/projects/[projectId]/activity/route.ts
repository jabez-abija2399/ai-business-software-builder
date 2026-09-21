import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { projectIdSchema } from "@/validations/project";
import { getAccessibleProject } from "@/server/db/project-overview";
import { getProjectActivity } from "@/server/db/project-activity";
import {
  apiSuccess,
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
    const idResult = projectIdSchema.safeParse({ projectId });
    if (!idResult.success) {
      return apiValidationError("Invalid project ID");
    }

    const accessible = await getAccessibleProject(projectId, session.user.id);
    if (!accessible) {
      const exists = Boolean(
        await import("@/lib/prisma").then((m) =>
          m.default.project.findUnique({ where: { id: projectId }, select: { id: true } })
        )
      );
      return exists ? apiForbidden() : apiNotFound("Project");
    }

    const data = await getProjectActivity(projectId);
    return apiSuccess(data);
  } catch (error) {
    console.error("Error loading project activity:", error);
    return apiInternalError();
  }
}