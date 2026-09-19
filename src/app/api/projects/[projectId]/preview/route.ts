import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getProject } from "@/server/db/projects";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
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

    // Get latest preview for this project
    const preview = await import("@/lib/prisma").then((m) =>
      m.default.deployment.findFirst({
        where: {
          projectId,
          environment: "preview",
        },
        orderBy: { createdAt: "desc" },
      })
    );

    return apiSuccess(preview || null);
  } catch (error) {
    console.error("Error fetching preview:", error);
    return apiInternalError();
  }
}
