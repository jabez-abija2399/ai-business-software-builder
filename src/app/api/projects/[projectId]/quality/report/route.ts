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

    // Get test records for this project
    const testRecords = await import("@/lib/prisma").then((m) =>
      m.default.testRecord.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      })
    );

    if (testRecords.length === 0) {
      return apiSuccess(null);
    }

    // Aggregate test metrics
    const passedTests = testRecords.filter((t) => t.status === "PASSED").length;
    const failedTests = testRecords.filter((t) => t.status === "FAILED").length;
    const totalTests = testRecords.length;
    const coverage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    return apiSuccess({
      overallScore: coverage,
      tests: {
        passed: passedTests,
        failed: failedTests,
        coverage,
      },
      security: {
        score: 0,
        vulnerabilities: 0,
      },
      accessibility: {
        score: 0,
        issues: 0,
      },
      performance: {
        score: 0,
        lcp: 0,
        fid: 0,
        cls: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching quality report:", error);
    return apiInternalError();
  }
}
