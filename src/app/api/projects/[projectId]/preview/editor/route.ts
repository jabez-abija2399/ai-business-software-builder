import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getPreviewEditorData } from "@/server/db/project-preview";
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
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
    const data = await getPreviewEditorData(projectId, session.user.id);
    if (!data) {
      return apiNotFound("Project");
    }

    return apiSuccess(data);
  } catch (error) {
    console.error("Error loading preview editor:", error);
    return apiInternalError();
  }
}