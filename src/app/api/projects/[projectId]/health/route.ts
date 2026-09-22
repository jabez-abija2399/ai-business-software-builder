import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, apiInternalError } from "@/lib/api-response";
import { getProjectHealth } from "@/server/db/monitoring";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }
    const { projectId } = await params;
    const data = await getProjectHealth(projectId, session.user.id);
    if (!data) {
      const exists = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      return exists ? apiForbidden("You do not have access to this project.") : apiNotFound("Project");
    }
    return apiSuccess(data);
  } catch (error) {
    console.error("Error loading project health:", error);
    return apiInternalError();
  }
}