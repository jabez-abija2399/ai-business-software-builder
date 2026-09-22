import { auth } from "@/auth";
import { apiSuccess, apiUnauthorized, apiInternalError } from "@/lib/api-response";
import { getUsageAnalytics } from "@/server/db/usage";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }
    const data = await getUsageAnalytics(session.user.id);
    return apiSuccess(data);
  } catch (error) {
    console.error("Error loading usage analytics:", error);
    return apiInternalError();
  }
}