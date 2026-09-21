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

/** Loose renderable shape of a persisted blueprint section. */
export type BlueprintSectionData =
  | Record<string, unknown>
  | Array<Record<string, unknown>>
  | string
  | null;

export interface BlueprintSections {
  businessContext: Record<string, unknown> | null;
  goals: Array<Record<string, unknown>>;
  personas: Array<Record<string, unknown>>;
  roles: Array<Record<string, unknown>>;
  permissions: Array<Record<string, unknown>>;
  features: Array<Record<string, unknown>>;
  entities: Array<Record<string, unknown>>;
  workflows: Array<Record<string, unknown>>;
  businessRules: Array<Record<string, unknown>>;
  integrations: Array<Record<string, unknown>>;
  nfrs: Array<Record<string, unknown>>;
  notes: string | null;
}

export interface BlueprintEditorData {
  project: BlueprintEditorProject;
  /** Latest blueprint by version, if any exists yet. */
  latestBlueprint: {
    id: string;
    version: number;
    status: string;
    createdAt: string;
    approvedAt: string | null;
    /** Saved raw business description from the newest analysis attempt. */
    rawDescription: string | null;
    hasContent: boolean;
    /** Full persisted specification sections (never invented). */
    sections: BlueprintSections;
  } | null;
  /** Most recent real analysis run (AgentRun) for this project, if any. */
  lastAnalysis: {
    id: string | null;
    status: BlueprintAnalysisStatus;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
    errorCode: string | null;
  } | null;
  /** Full persisted version history — used for read-only review of old drafts. */
  versions: {
    version: number;
    status: string;
    createdAt: string;
    approvedAt: string | null;
  }[];
  /** Unresolved decisions (status PROPOSED) — real records only. */
  decisions: { id: string; decisionKey: string; title: string; status: string; context: string | null; decision: string | null }[];
  /** Open known issues (status OPEN) — real records only. */
  knownIssues: {
    id: string;
    issueKey: string;
    title: string;
    severity: string;
    status: string;
    description: string | null;
  }[];
}

function nonEmptyArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.length > 0;
}

function parseSection(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value.filter((v) => v && typeof v === "object") as Array<Record<string, unknown>>) : [];
}

function parseContext(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * Loads everything the Blueprint screen needs to render its states honestly:
 * - brand-new project, no description
 * - saved description but no analyzed blueprint
 * - analysis in flight (real AgentRun)
 * - a previously failed analysis
 * - an existing blueprint + versions to review
 * - open decisions / known issues
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
          approvedAt: true,
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

  const [lastAnalysis, versions, decisions, knownIssues] = await prisma.$transaction([
    prisma.agentRun.findFirst({
      where: { projectId, taskType: "BLUEPRINT_ANALYSIS" },
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
    prisma.businessBlueprint.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
      select: {
        version: true,
        status: true,
        createdAt: true,
        approvedAt: true,
      },
    }),
    prisma.decision.findMany({
      where: { projectId, status: "PROPOSED" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        decisionKey: true,
        title: true,
        status: true,
        context: true,
        decision: true,
      },
    }),
    prisma.knownIssue.findMany({
      where: { projectId, status: "OPEN" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        issueKey: true,
        title: true,
        severity: true,
        status: true,
        description: true,
      },
    }),
  ]);

  const b = project.blueprints[0] ?? null;
  const context = b ? parseContext(b.businessContextJson) : null;
  const rawDescription =
    typeof context?.rawDescription === "string" ? context.rawDescription : null;

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
          approvedAt: b.approvedAt?.toISOString() ?? null,
          rawDescription,
          sections: {
            businessContext: context,
            goals: parseSection(b.goalsJson),
            personas: parseSection(b.personasJson),
            roles: parseSection(b.rolesJson),
            permissions: parseSection(b.permissionsJson),
            features: parseSection(b.featuresJson),
            entities: parseSection(b.entitiesJson),
            workflows: parseSection(b.workflowsJson),
            businessRules: parseSection(b.businessRulesJson),
            integrations: parseSection(b.integrationsJson),
            nfrs: parseSection(b.nfrJson),
            notes: b.notes,
          },
          hasContent: [
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
          ].some(nonEmptyArray),
        }
      : null,
    lastAnalysis: lastAnalysis
      ? {
          id: lastAnalysis.id,
          status: lastAnalysis.status as BlueprintAnalysisStatus,
          createdAt: lastAnalysis.createdAt.toISOString(),
          startedAt: lastAnalysis.startedAt?.toISOString() ?? null,
          completedAt: lastAnalysis.completedAt?.toISOString() ?? null,
          errorMessage: lastAnalysis.errorMessage,
          errorCode: lastAnalysis.errorCode,
        }
      : null,
    versions: versions.map((v) => ({
      version: v.version,
      status: v.status,
      createdAt: v.createdAt.toISOString(),
      approvedAt: v.approvedAt?.toISOString() ?? null,
    })),
    decisions,
    knownIssues,
  };
}