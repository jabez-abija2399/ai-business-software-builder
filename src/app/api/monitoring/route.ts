import { auth } from "@/auth";
import { apiSuccess, apiUnauthorized, apiInternalError } from "@/lib/api-response";
import { getPlatformMonitoring } from "@/server/db/monitoring";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }
    const data = await getPlatformMonitoring(session.user.id);
    return apiSuccess(data);
  } catch (error) {
    console.error("Error loading platform monitoring:", error);
    return apiInternalError();
  }
}