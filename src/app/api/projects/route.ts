import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createProject, listProjects } from "@/server/db/projects";
import { createProjectSchema } from "@/validations/project";
import {
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiValidationError,
  apiInternalError,
} from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20");
    const cursor = searchParams.get("cursor") || undefined;

    // Get user's organization
    const user = await import("@/lib/prisma").then((m) =>
      m.default.organizationMember.findFirst({
        where: { userId: session.user.id },
        select: { organizationId: true },
      })
    );

    if (!user) {
      return apiSuccess({ projects: [], nextCursor: null });
    }

    const result = await listProjects(user.organizationId, {
      status,
      limit,
      cursor,
    });

    return apiSuccess(result);
  } catch (error) {
    console.error("Error listing projects:", error);
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const validationResult = createProjectSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error.flatten());
    }

    // Get user's organization
    const user = await import("@/lib/prisma").then((m) =>
      m.default.organizationMember.findFirst({
        where: { userId: session.user.id },
        select: { organizationId: true },
      })
    );

    if (!user) {
      return apiInternalError("No organization found");
    }

    const project = await createProject({
      organizationId: user.organizationId,
      ownerId: session.user.id,
      ...validationResult.data,
    });

    return apiCreated(project);
  } catch (error) {
    console.error("Error creating project:", error);
    return apiInternalError();
  }
}
