import prisma from "@/lib/prisma";
import {
  BUILD_TASK_TYPES,
  FAILED_RUN_STATUSES,
  IN_FLIGHT_RUN_STATUSES,
  QUALITY_TASK_TYPES,
} from "@/lib/pipeline";
import { readWorkspaceFile } from "@/server/jobs/workspace";
import { type PipelineRunStatus, type StageEditorProject, resolveAccess } from "./stage-shared";

export interface WorkspaceFile {
  id: string;
  type: string;
  filePath: string;
  checksum: string;
  bytes: number | null;
  createdAt: string;
  /** null when the file has been purged from the workspace on disk. */
  content: string | null;
}

export interface WorkspaceCheck {
  id: string;
  taskType: string;
  status: PipelineRunStatus;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface WorkspaceEditorData {
  project: StageEditorProject;
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  files: WorkspaceFile[];
  sourceCount: number;
  testCount: number;
  hasSchema: boolean;
  /** Latest run per check task type (lint, typecheck, the 4 quality types). */
  checks: WorkspaceCheck[];
  hasCompletedBuild: boolean;
  /** Distinct failed build task types, ready for the repair loop. */
  failedBuildTaskTypes: string[];
  repairAvailable: boolean;
  repairInFlight: boolean;
}

const CHECK_TASK_TYPES = ["RUN_LINT", "RUN_TYPECHECK", ...QUALITY_TASK_TYPES];

/**
 * Loads the real generated workspace: every ProjectArtifact row (newest version
 * per path, content read from the worker's sandbox on disk), a summary of the
 * check runs, and what is repairable. Like every stage, it only reports
 * genuinely persisted state — a file whose content is no longer on disk is
 * reported as such, never reconstructed.
 */
export async function getWorkspaceEditorData(
  projectId: string,
  userId: string
): Promise<WorkspaceEditorData | null> {
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

  const artifacts = await prisma.projectArtifact.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 400,
    select: {
      id: true,
      type: true,
      filePath: true,
      checksum: true,
      metadataJson: true,
      createdAt: true,
      contentRef: true,
    },
  });

  const byPath = new Map<string, WorkspaceFile>();
  for (const artifact of artifacts) {
    if (byPath.has(artifact.filePath)) continue;

    const bytes =
      artifact.metadataJson &&
      typeof artifact.metadataJson === "object" &&
      "bytes" in artifact.metadataJson &&
      typeof artifact.metadataJson.bytes === "number"
        ? artifact.metadataJson.bytes
        : null;

    byPath.set(artifact.filePath, {
      id: artifact.id,
      type: artifact.type,
      filePath: artifact.filePath,
      checksum: artifact.checksum,
      bytes,
      createdAt: artifact.createdAt.toISOString(),
      content: await readWorkspaceFile(projectId, artifact.contentRef),
    });
  }

  const files = Array.from(byPath.values()).sort((a, b) =>
    a.filePath.localeCompare(b.filePath)
  );

  const checkRuns = await prisma.agentRun.findMany({
    where: { projectId, taskType: { in: CHECK_TASK_TYPES } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      taskType: true,
      status: true,
      errorCode: true,
      errorMessage: true,
      createdAt: true,
      completedAt: true,
    },
  });

  const latestByType = new Map<string, WorkspaceCheck>();
  for (const run of checkRuns) {
    if (latestByType.has(run.taskType)) continue;
    latestByType.set(run.taskType, {
      id: run.id,
      taskType: run.taskType,
      status: run.status as PipelineRunStatus,
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    });
  }
  const checks = CHECK_TASK_TYPES.filter((t) => latestByType.has(t)).map((t) =>
    latestByType.get(t)!
  );

  const buildRuns = await prisma.agentRun.findMany({
    where: { projectId, taskType: { in: BUILD_TASK_TYPES } },
    select: { taskType: true, status: true },
  });

  const hasCompletedBuild = buildRuns.some((r) => r.status === "COMPLETED");
  const failedBuildTaskTypes = Array.from(
    new Set(
      buildRuns
        .filter((r) => FAILED_RUN_STATUSES.includes(r.status))
        .map((r) => r.taskType)
    )
  ).sort();
  const repairCandidates = failedBuildTaskTypes.filter((t) => t !== "INSTALL_DEPENDENCIES");
  const anyInFlight = await prisma.agentRun.findFirst({
    where: {
      projectId,
      taskType: { in: BUILD_TASK_TYPES },
      status: { in: IN_FLIGHT_RUN_STATUSES },
    },
    select: { id: true },
  });

  const blueprint = project.blueprints.find((b) => b.status === "APPROVED") ?? null;

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
    files,
    sourceCount: files.filter(
      (f) =>
        f.type === "SOURCE_FILE" || f.type === "SCHEMA" || f.type === "STYLE"
    ).length,
    testCount: files.filter((f) => f.type === "TEST").length,
    hasSchema: files.some((f) => f.type === "SCHEMA"),
    checks,
    hasCompletedBuild,
    failedBuildTaskTypes,
    repairAvailable: Boolean(blueprint && !anyInFlight && repairCandidates.length > 0),
    repairInFlight: Boolean(anyInFlight),
  };
}