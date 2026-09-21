import prisma from "@/lib/prisma";

export type BlueprintAnalysisStatus =
  | "QUEUED"
  | "RUNNING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "ERROR"
  | "CANCELLED";

export interface BlueprintEditorProject {
  id: string;
  name: string;
  description: string | null;
  mode: string;
  environment: string;
  /** Owner or org member — the existing access system decides, not the UI. */
  canEdit: boolean;
  /** Project owner only — gates owner-scoped actions (e.g. approve). */
  isOwner: boolean;
}

export interface BlueprintEditorData {
  project: BlueprintEditorProject;
  /** Latest blueprint by version, if any exists yet. */
  latestBlueprint: {
    id: string;
    version: number;
    status: string;
    createdAt: string;
    notes: string | null;
    /** Saved raw business description from the newest analysis attempt. */
    rawDescription: string | null;
    /** True when blueprint sections beyond the raw description are populated. */
    hasRealContent: boolean;
  } | null;
  /** Most recent real analysis run (AgentRun) for this project, if any. */
  lastAnalysis: {
    status: BlueprintAnalysisStatus;
    createdAt: string;
    errorMessage: string | null;
  } | null;
}

/**
 * Loads everything the Blueprint screen needs to render §1 states honestly:
 * - brand-new project, no description
 * - saved description but no analyzed blueprint
 * - a previously failed analysis
 * Access (owner or org member) is enforced here; non-accessible projects
 * return null and the layout turns that into notFound().
 */
export async function getBlueprintEditorData(
  projectId: string,
  userId: string
): Promise<BlueprintEditorData | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      mode: true,
      environment: true,
      ownerId: true,
      organizationId: true,
      blueprints: {
        orderBy: { version: "desc" },
        take: 1,
        select: {
          id: true,
          version: true,
          status: true,
          createdAt: true,
          notes: true,
          businessContextJson: true,
          goalsJson: true,
          personasJson: true,
          rolesJson: true,
          permissionsJson: true,
          featuresJson: true,
          entitiesJson: true,
          workflowsJson: true,
          businessRulesJson: true,
          integrationsJson: true,
          nfrJson: true,
        },
      },
    },
  });

  if (!project) return null;

  const isOwner = project.ownerId === userId;
  const canEdit =
    isOwner ||
    Boolean(
      await prisma.organizationMember.findFirst({
        where: { userId, organizationId: project.organizationId },
        select: { id: true },
      })
    );

  if (!canEdit) return null;

  const [lastAnalysis] = await prisma.$transaction([
    prisma.agentRun.findFirst({
      where: {
        projectId,
        taskType: "BLUEPRINT_ANALYSIS",
      },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        createdAt: true,
        errorMessage: true,
      },
    }),
  ]);

  const b = project.blueprints[0] ?? null;
  const rawDescription = (() => {
    if (!b) return null;
    const ctx = b.businessContextJson as Record<string, unknown> | null;
    return typeof ctx?.rawDescription === "string" ? ctx.rawDescription : null;
  })();

  const sectionPopulated = (v: unknown) =>
    Array.isArray(v) ? v.length > 0 : v != null;

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      mode: project.mode,
      environment: project.environment,
      canEdit,
      isOwner,
    },
    latestBlueprint: b
      ? {
          id: b.id,
          version: b.version,
          status: b.status,
          createdAt: b.createdAt.toISOString(),
          notes: b.notes,
          rawDescription,
          hasRealContent: [
            b.goalsJson,
            b.personasJson,
            b.rolesJson,
            b.permissionsJson,
            b.featuresJson,
            b.entitiesJson,
            b.workflowsJson,
            b.businessRulesJson,
            b.integrationsJson,
            b.nfrJson,
          ].some(sectionPopulated),
        }
      : null,
    lastAnalysis: lastAnalysis
      ? {
          status: lastAnalysis.status as BlueprintAnalysisStatus,
          createdAt: lastAnalysis.createdAt.toISOString(),
          errorMessage: lastAnalysis.errorMessage,
        }
      : null,
  };
}