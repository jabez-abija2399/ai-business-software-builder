import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createProject, listProjects } from "@/server/db/projects";
import { getPrimaryOrganizationId } from "@/server/db/organizations";
import {
  createProjectSchema,
  listProjectsQuerySchema,
} from "@/validations/project";
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
    const parsed = listProjectsQuerySchema.safeParse({
      search: searchParams.get("search") ?? undefined,
      filter: searchParams.get("filter") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    if (!parsed.success) {
      return apiValidationError(parsed.error.flatten());
    }

    const organizationId = await getPrimaryOrganizationId(session.user.id);
    if (!organizationId) {
      return apiSuccess({ projects: [], nextCursor: null, total: 0 });
    }

    const result = await listProjects(organizationId, parsed.data);

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

    const organizationId = await getPrimaryOrganizationId(session.user.id);
    if (!organizationId) {
      return apiInternalError("No organization found");
    }

    const project = await createProject({
      organizationId,
      ownerId: session.user.id,
      ...validationResult.data,
    });

    return apiCreated(project);
  } catch (error) {
    console.error("Error creating project:", error);
    return apiInternalError();
  }
}
