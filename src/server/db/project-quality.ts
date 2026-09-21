import prisma from "@/lib/prisma";
import { BUILD_TASK_TYPES, QUALITY_TASK_TYPES } from "@/lib/pipeline";
import { type PipelineRunStatus, type StageEditorProject, resolveAccess } from "./stage-shared";

export interface QualityTestRecord {
  id: string;
  testType: string;
  name: string;
  status: string;
  durationMs: number | null;
  errorMessage: string | null;
  commandRef: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface QualityEditorData {
  project: StageEditorProject;
  /** Approved blueprint context (the stage builds on it). */
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  /** Gate: quality checks require at least one completed build run. */
  hasCompletedBuild: boolean;
  /** Real quality-type runs only — never mixed with other stages' runs. */
  runs: {
    id: string;
    taskType: string;
    status: PipelineRunStatus;
    createdAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }[];
  /** Real persisted test records. Aggregates are derived from these only. */
  testRecords: QualityTestRecord[];
}

/**
 * Loads everything the Quality screen needs. Every number shown to the user is
 * derived from real TestRecord rows — there is no fabricated overall score,
 * coverage percentage, or Lighthouse metric.
 */
export async function getQualityEditorData(
  projectId: string,
  userId: string
): Promise<QualityEditorData | null> {
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

  const [buildRun, runs, testRecords] = await prisma.$transaction([
    prisma.agentRun.findFirst({
      where: { projectId, taskType: { in: BUILD_TASK_TYPES }, status: "COMPLETED" },
      select: { id: true },
    }),
    prisma.agentRun.findMany({
      where: { projectId, taskType: { in: QUALITY_TASK_TYPES } },
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
    prisma.testRecord.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        testType: true,
        name: true,
        status: true,
        durationMs: true,
        errorMessage: true,
        commandRef: true,
        createdAt: true,
        completedAt: true,
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
    hasCompletedBuild: buildRun != null,
    runs: runs.map((r) => ({
      id: r.id,
      taskType: r.taskType,
      status: r.status as PipelineRunStatus,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      errorMessage: r.errorMessage,
    })),
    testRecords: testRecords.map((t) => ({
      id: t.id,
      testType: t.testType,
      name: t.name,
      status: t.status,
      durationMs: t.durationMs,
      errorMessage: t.errorMessage,
      commandRef: t.commandRef,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() ?? null,
    })),
  };
}