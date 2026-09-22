import prisma from "@/lib/prisma";
import { BUILD_TASK_TYPES, REVIEW_TASK_TYPES } from "@/lib/pipeline";
import { type PipelineRunStatus, type StageEditorProject, resolveAccess } from "./stage-shared";
import { readWorkspaceFile } from "@/server/jobs/workspace";

export interface ReviewArtifact {
  id: string;
  type: string;
  filePath: string;
  version: number;
  createdAt: string;
  content: string;
  summary: Record<string, unknown> | null;
}

export interface ReviewEditorData {
  project: StageEditorProject;
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  /** Gate: review agents work on the real files, so a completed build is required. */
  hasCompletedBuild: boolean;
  /** Real review-type runs only. */
  runs: {
    id: string;
    taskType: string;
    status: PipelineRunStatus;
    createdAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }[];
  /** Real README + agent-review artifacts produced by the review agents. */
  artifacts: ReviewArtifact[];
}

const REVIEW_ARTIFACT_TYPES = ["README", "REVIEW_REPORT"];

const MAX_ARTIFACT_CONTENT = 120_000;

/**
 * Loads everything the Review screen needs — all from real rows. The README and
 * review report bodies are read from the actual workspace files those agents
 * wrote.
 */
export async function getReviewEditorData(
  projectId: string,
  userId: string
): Promise<ReviewEditorData | null> {
  const access = await resolveAccess(projectId, userId);
  if (!access.accessible) return null;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      mode: true,
      environment: true,
      blueprints: {
        orderBy: { version: "desc" },
        select: { id: true, version: true, status: true, approvedAt: true },
      },
    },
  });

  if (!project) return null;

  const [buildRun, runs, artifacts] = await prisma.$transaction([
    prisma.agentRun.findFirst({
      where: { projectId, taskType: { in: BUILD_TASK_TYPES }, status: "COMPLETED" },
      select: { id: true },
    }),
    prisma.agentRun.findMany({
      where: { projectId, taskType: { in: REVIEW_TASK_TYPES } },
      orderBy: [{ createdAt: "asc" }, { taskType: "asc" }],
      select: {
        id: true,
        taskType: true,
        status: true,
        createdAt: true,
        completedAt: true,
        errorMessage: true,
      },
    }),
    prisma.projectArtifact.findMany({
      where: { projectId, type: { in: REVIEW_ARTIFACT_TYPES } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        filePath: true,
        version: true,
        createdAt: true,
        contentRef: true,
        metadataJson: true,
      },
    }),
  ]);

  const blueprint = project.blueprints.find((b) => b.status === "APPROVED") ?? null;

  const readArtifacts: ReviewArtifact[] = [];
  for (const artifact of artifacts) {
    const content = (await readWorkspaceFile(projectId, artifact.contentRef)) ?? "";
    readArtifacts.push({
      id: artifact.id,
      type: artifact.type,
      filePath: artifact.filePath,
      version: artifact.version,
      createdAt: artifact.createdAt.toISOString(),
      content: content.slice(0, MAX_ARTIFACT_CONTENT),
      summary:
        artifact.metadataJson && typeof artifact.metadataJson === "object"
          ? (artifact.metadataJson as Record<string, unknown>)
          : null,
    });
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      mode: project.mode,
      environment: project.environment,
      canEdit: access.canEdit,
      isOwner: access.isOwner,
    },
    blueprint: blueprint
      ? {
          id: blueprint.id,
          version: blueprint.version,
          status: blueprint.status,
          approvedAt: blueprint.approvedAt?.toISOString() ?? null,
        }
      : null,
    hasCompletedBuild: buildRun != null,
    runs: runs.map((r) => ({
      id: r.id,
      taskType: r.taskType,
      status: r.status as PipelineRunStatus,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      errorMessage: r.errorMessage,
    })),
    artifacts: readArtifacts,
  };
}