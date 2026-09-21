import prisma from "@/lib/prisma";
import { BUILD_TASK_TYPES } from "@/lib/pipeline";
import { type PipelineRunStatus, type StageEditorProject, resolveAccess } from "./stage-shared";

export interface BuildTaskRun {
  id: string;
  taskType: string;
  status: PipelineRunStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface BuildEditorData {
  project: StageEditorProject;
  /** Approved blueprint the build is generated from (the stage gate). */
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  /** Real build-type runs only — never mixed with other stages' runs. */
  runs: BuildTaskRun[];
  /** Real source/artifact files persisted by the build. */
  artifacts: {
    id: string;
    type: string;
    version: number;
    filePath: string;
    createdAt: string;
  }[];
  /** True when at least one build-type run reached COMPLETED. */
  hasCompletedBuild: boolean;
}

/**
 * Loads everything the Build screen needs. Crucially, only AgentRuns whose
 * taskType is one of the build task types are returned — the previous
 * implementation summed *all* project runs regardless of stage.
 */
export async function getBuildEditorData(
  projectId: string,
  userId: string
): Promise<BuildEditorData | null> {
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

  const [runs, artifacts] = await prisma.$transaction([
    prisma.agentRun.findMany({
      where: { projectId, taskType: { in: BUILD_TASK_TYPES } },
      orderBy: [{ createdAt: "asc" }, { taskType: "asc" }],
      select: {
        id: true,
        taskType: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        errorMessage: true,
      },
    }),
    prisma.projectArtifact.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        type: true,
        version: true,
        filePath: true,
        createdAt: true,
      },
    }),
  ]);

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
    runs: runs.map((r) => ({
      id: r.id,
      taskType: r.taskType,
      status: r.status as PipelineRunStatus,
      createdAt: r.createdAt.toISOString(),
      startedAt: r.startedAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      errorMessage: r.errorMessage,
    })),
    artifacts: artifacts.map((a) => ({
      id: a.id,
      type: a.type,
      version: a.version,
      filePath: a.filePath,
      createdAt: a.createdAt.toISOString(),
    })),
    hasCompletedBuild: runs.some((r) => r.status === "COMPLETED"),
  };
}