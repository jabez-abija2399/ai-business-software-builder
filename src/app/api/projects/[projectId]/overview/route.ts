import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { projectIdSchema } from "@/validations/project";
import { overviewQuerySchema } from "@/validations/overview";
import { getAccessibleProject, getProjectOverviewStats } from "@/server/db/project-overview";
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

    const { searchParams } = new URL(request.url);
    const rangeResult = overviewQuerySchema.safeParse({
      range: searchParams.get("range") ?? undefined,
    });
    if (!rangeResult.success) {
      return apiValidationError(rangeResult.error.flatten());
    }

    const accessible = await getAccessibleProject(projectId, session.user.id);
    if (!accessible) {
      // Distinguish "missing" from "forbidden" without leaking existence.
      const exists = Boolean(
        await import("@/lib/prisma").then((m) =>
          m.default.project.findUnique({ where: { id: projectId }, select: { id: true } })
        )
      );
      return exists ? apiForbidden() : apiNotFound("Project");
    }

    const data = await getProjectOverviewStats(projectId, rangeResult.data.range);
    return apiSuccess(data);
  } catch (error) {
    console.error("Error loading project overview:", error);
    return apiInternalError();
  }
}