import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getProject } from "@/server/db/projects";
import { getLatestApprovedBlueprint } from "@/server/db/blueprints";
import {
  apiSuccess,
  apiCreated,
  apiAccepted,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiValidationError,
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

    const deployments = await import("@/lib/prisma").then((m) =>
      m.default.deployment.findMany({
        where: {
          projectId,
          environment: { not: "preview" },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    );

    return apiSuccess(deployments);
  } catch (error) {
    console.error("Error fetching deployments:", error);
    return apiInternalError();
  }
}

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
    const body = await request.json();

    if (!body.environment || !["staging", "production"].includes(body.environment)) {
      return apiValidationError("Environment must be 'staging' or 'production'");
    }

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
      return apiNotFound("Approved blueprint (required before deploying)");
    }

    // Check for existing in-progress deployment
    const existingDeployment = await import("@/lib/prisma").then((m) =>
      m.default.deployment.findFirst({
        where: {
          projectId,
          environment: body.environment,
          status: { in: ["PENDING", "BUILDING", "DEPLOYING"] },
        },
      })
    );

    if (existingDeployment) {
      return apiAccepted({
        status: "already_in_progress",
        deploymentId: existingDeployment.id,
        message: "Deployment already in progress.",
      });
    }

    // Create deployment
    const deployment = await import("@/lib/prisma").then((m) =>
      m.default.deployment.create({
        data: {
          projectId,
          environment: body.environment,
          status: "PENDING",
          provider: "vercel",
          deploymentUrl:
            body.environment === "production"
              ? `https://${project.name.toLowerCase().replace(/\s+/g, "-")}.vercel.app`
              : `https://${project.name.toLowerCase().replace(/\s+/g, "-")}-staging.vercel.app`,
        },
      })
    );

    // In production, this would trigger a deployment pipeline
    const jobId = `deploy_${Date.now()}`;

    return apiCreated({
      jobId,
      deploymentId: deployment.id,
      url: deployment.deploymentUrl,
      status: "queued",
      estimatedDurationSeconds: 180,
      websocketUrl: `wss://api.example.com/ws/jobs/${jobId}`,
    });
  } catch (error) {
    console.error("Error creating deployment:", error);
    return apiInternalError();
  }
}
