import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getProject } from "@/server/db/projects";
import { getLatestApprovedBlueprint } from "@/server/db/blueprints";
import {
  apiAccepted,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiInternalError,
} from "@/lib/api-response";

export async function POST(
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

    const blueprint = await getLatestApprovedBlueprint(projectId);
    if (!blueprint) {
      return apiNotFound("Approved blueprint (required before preview)");
    }

    // Check for existing in-progress preview
    const existingPreview = await import("@/lib/prisma").then((m) =>
      m.default.deployment.findFirst({
        where: {
          projectId,
          environment: "preview",
          status: { in: ["PENDING", "BUILDING", "DEPLOYING"] },
        },
      })
    );

    if (existingPreview) {
      return apiAccepted({
        status: "already_in_progress",
        deploymentId: existingPreview.id,
        message: "Preview creation already in progress.",
      });
    }

    // Create preview deployment
    const deployment = await import("@/lib/prisma").then((m) =>
      m.default.deployment.create({
        data: {
          projectId,
          environment: "preview",
          status: "PENDING",
          provider: "vercel",
          deploymentUrl: `https://preview-${projectId.slice(0, 8)}.vercel.app`,
        },
      })
    );

    // In production, this would trigger a preview build
    const jobId = `preview_${Date.now()}`;

    return apiAccepted({
      jobId,
      deploymentId: deployment.id,
      url: deployment.deploymentUrl,
      status: "queued",
      estimatedDurationSeconds: 120,
      websocketUrl: `wss://api.example.com/ws/jobs/${jobId}`,
    });
  } catch (error) {
    console.error("Error creating preview:", error);
    return apiInternalError();
  }
}
