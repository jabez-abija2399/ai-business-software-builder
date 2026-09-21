import prisma from "@/lib/prisma";
import { DESIGN_TASK_TYPES } from "@/lib/pipeline";
import { type PipelineRunStatus, type StageEditorProject, resolveAccess } from "./stage-shared";

export interface DesignEditorData {
  project: StageEditorProject;
  /** Approved blueprint the design builds on (the stage gate). */
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  /** Most recent real design run (AgentRun), if any. */
  lastDesignRun: {
    id: string | null;
    status: PipelineRunStatus;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
    errorCode: string | null;
  } | null;
  /** Latest design artifact by version, with its real persisted sections. */
  latestDesign: {
    id: string;
    version: number;
    status: string;
    hasContent: boolean;
    tokens: Record<string, unknown> | null;
    components: Array<Record<string, unknown>>;
    pages: Array<Record<string, unknown>>;
    states: Array<Record<string, unknown>>;
    responsiveRules: Array<Record<string, unknown>>;
  } | null;
  /** Full persisted design version history. */
  designVersions: {
    version: number;
    status: string;
    createdAt: string;
  }[];
}

/**
 * Loads everything the Design screen needs to render its states honestly:
 * - no approved blueprint yet (locked stage)
 * - design generation in flight (real AgentRun)
 * - a previously failed design run
 * - a completed design with no persisted content yet
 * - an existing design artifact to review
 */

function isNonEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return typeof value === "string" && value.trim().length > 0;
}

export async function getDesignEditorData(
  projectId: string,
  userId: string
): Promise<DesignEditorData | null> {
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

  const [lastDesignRun, latestDesign, designVersions] = await prisma.$transaction([
    prisma.agentRun.findFirst({
      where: { projectId, taskType: { in: DESIGN_TASK_TYPES } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        errorMessage: true,
        errorCode: true,
      },
    }),
    prisma.designArtifact.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
    }),
    prisma.designArtifact.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
      select: { version: true, status: true, createdAt: true },
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
    lastDesignRun: lastDesignRun
      ? {
          id: lastDesignRun.id,
          status: lastDesignRun.status as PipelineRunStatus,
          createdAt: lastDesignRun.createdAt.toISOString(),
          startedAt: lastDesignRun.startedAt?.toISOString() ?? null,
          completedAt: lastDesignRun.completedAt?.toISOString() ?? null,
          errorMessage: lastDesignRun.errorMessage,
          errorCode: lastDesignRun.errorCode,
        }
      : null,
    latestDesign: latestDesign
      ? {
          id: latestDesign.id,
          version: latestDesign.version,
          status: latestDesign.status,
          hasContent: [
            latestDesign.tokensJson,
            latestDesign.componentsJson,
            latestDesign.pagesJson,
            latestDesign.statesJson,
            latestDesign.responsiveRulesJson,
          ].some((s: unknown) => isNonEmpty(s)),
          tokens: typeof latestDesign.tokensJson === "object" && latestDesign.tokensJson !== null
            ? (latestDesign.tokensJson as Record<string, unknown>)
            : null,
          components: Array.isArray(latestDesign.componentsJson)
            ? (latestDesign.componentsJson as Array<Record<string, unknown>>)
            : [],
          pages: Array.isArray(latestDesign.pagesJson)
            ? (latestDesign.pagesJson as Array<Record<string, unknown>>)
            : [],
          states: Array.isArray(latestDesign.statesJson)
            ? (latestDesign.statesJson as Array<Record<string, unknown>>)
            : [],
          responsiveRules: Array.isArray(latestDesign.responsiveRulesJson)
            ? (latestDesign.responsiveRulesJson as Array<Record<string, unknown>>)
            : [],
        }
      : null,
    designVersions: designVersions.map((d) => ({
      version: d.version,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    })),
  };
}

export { DESIGN_TASK_TYPES };