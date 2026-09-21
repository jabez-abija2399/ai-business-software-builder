import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDesignEditorData } from "@/server/db/project-design";
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiForbidden,
  apiInternalError,
} from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { projectId } = await params;
    const data = await getDesignEditorData(projectId, session.user.id);
    if (!data) {
      return apiNotFound("Project");
    }

    return apiSuccess(data);
  } catch (error) {
    console.error("Error loading design editor:", error);
    return apiInternalError();
  }
}