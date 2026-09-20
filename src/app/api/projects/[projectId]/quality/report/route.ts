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

    const securityTests = testRecords.filter((t) => t.testType === "SECURITY");
    const accessibilityTests = testRecords.filter((t) => t.testType === "ACCESSIBILITY");
    const performanceTests = testRecords.filter((t) => t.testType === "PERFORMANCE");

    const securityScore =
      securityTests.length > 0
        ? Math.round(
            (securityTests.filter((t) => t.status === "PASSED").length /
              securityTests.length) *
              100
          )
        : 0;
    const accessibilityScore =
      accessibilityTests.length > 0
        ? Math.round(
            (accessibilityTests.filter((t) => t.status === "PASSED").length /
              accessibilityTests.length) *
              100
          )
        : 0;
    const performanceScore =
      performanceTests.length > 0
        ? Math.round(
            (performanceTests.filter((t) => t.status === "PASSED").length /
              performanceTests.length) *
              100
          )
        : 0;

    return apiSuccess({
      overallScore: coverage,
      tests: {
        passed: passedTests,
        failed: failedTests,
        coverage,
      },
      security: {
        score: securityScore,
        vulnerabilities: securityTests.filter((t) => t.status === "FAILED").length,
      },
      accessibility: {
        score: accessibilityScore,
        issues: accessibilityTests.filter((t) => t.status === "FAILED").length,
      },
      performance: {
        score: performanceScore,
        lcp: performanceTests.length > 0 ? 0 : 0,
        fid: performanceTests.length > 0 ? 0 : 0,
        cls: performanceTests.length > 0 ? 0 : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching quality report:", error);
    return apiInternalError();
  }
}
