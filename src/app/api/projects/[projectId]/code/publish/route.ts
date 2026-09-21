import { type NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getProject } from "@/server/db/projects";
import { getLatestApprovedBlueprint } from "@/server/db/blueprints";
import {
  IN_FLIGHT_RUN_STATUSES,
  BUILD_AGENT_TYPE,
  BUILD_TASK_TYPES,
  GIT_AGENT_TYPE,
  GITHUB_PUBLISH_TASK_TYPE,
} from "@/lib/pipeline";
import {
  apiAccepted,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiConflict,
  apiInternalError,
} from "@/lib/api-response";
import { getAuthenticatedUser, githubConfig, GitHubError } from "@/server/github/client";

function repoSlug(name: string): string {
  return (
    String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "app"
  );
}

/**
 * Queues a real GITHUB_PUBLISH AgentRun. The worker pushes the generated files
 * to GitHub via the Git Data API; this route only enqueues real work and
 * reports the expected target (real owner + computed repo name). Configuration
 * problems surface as 409s here so the UI never implies a publish is possible
 * when GitHub is not configured.
 */
export async function POST(
  _request: NextRequest,
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
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id, organizationId: project.organizationId },
        select: { id: true },
      });
      if (!membership) return apiForbidden();
    }

    const blueprint = await getLatestApprovedBlueprint(projectId);
    if (!blueprint) {
      return apiNotFound("Approved blueprint (required before publishing)");
    }

    const completedBuild = await prisma.agentRun.findFirst({
      where: {
        projectId,
        taskType: { in: BUILD_TASK_TYPES },
        status: "COMPLETED",
      },
      select: { id: true },
    });
    if (!completedBuild) {
      return apiConflict("Run the build first — publishing requires generated files on disk.");
    }

    const publishInFlight = await prisma.agentRun.findFirst({
      where: {
        projectId,
        taskType: GITHUB_PUBLISH_TASK_TYPE,
        status: { in: IN_FLIGHT_RUN_STATUSES },
      },
      select: { id: true },
    });
    if (publishInFlight) {
      return apiConflict("A publish is already queued or running. Wait for it to finish.");
    }

    const config = githubConfig();
    let owner: string | null = config.owner;
    if (!config.token) {
      return apiConflict(
        "GitHub publishing is not configured. Set GITHUB_TOKEN in the server environment (gitignored)."
      );
    }
    if (!owner) {
      owner = await getAuthenticatedUser(config.token);
    }
    const target = `${owner}/${config.repoPrefix}-${repoSlug(project.name)}`;

    const run = await prisma.agentRun.create({
      data: {
        projectId,
        userId: session.user.id,
        taskType: GITHUB_PUBLISH_TASK_TYPE,
        agentType: GIT_AGENT_TYPE,
        status: "QUEUED",
        inputArtifactVersion: blueprint.version,
      },
    });

    return apiAccepted({
      status: "queued",
      runId: run.id,
      target,
      message: `Publish queued — will be pushed to ${target} once the worker runs.`,
    });
  } catch (error) {
    if (error instanceof GitHubError) {
      return apiConflict(error.message);
    }
    console.error("Error queueing GitHub publish:", error);
    return apiInternalError();
  }
}