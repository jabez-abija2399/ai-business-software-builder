import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type {
  ListProjectsParams,
  ProjectEnvironment,
  ProjectListItem,
  ProjectListResponse,
  ProjectStatus,
} from "@/features/projects/types";

export interface CreateProjectInput {
  organizationId: string;
  ownerId: string;
  name: string;
  description?: string;
  mode?: string;
  environment?: ProjectEnvironment;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  mode?: string;
  environment?: ProjectEnvironment;
  status?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Derives a single, semantic status for a project from its persistence state
 * plus the most recent agent run and any pending approvals. Keeping this
 * server-side means the client never has to fetch per-project analytics.
 */
export function deriveProjectStatus(input: {
  status: string;
  deletedAt: Date | null;
  latestRunStatus?: string;
  hasPendingApproval: boolean;
}): ProjectStatus {
  if (input.status === "ARCHIVED" || input.deletedAt) {
    return "ARCHIVED";
  }
  if (input.latestRunStatus === "FAILED" || input.latestRunStatus === "ERROR") {
    return "ERROR";
  }
  if (input.hasPendingApproval) {
    return "ATTENTION";
  }
  if (
    input.latestRunStatus === "RUNNING" ||
    input.latestRunStatus === "QUEUED"
  ) {
    return "BUILDING";
  }
  return "ACTIVE";
}

function buildProjectWhere(
  organizationId: string,
  params: ListProjectsParams
): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {
    organizationId,
  };

  const filter = params.filter ?? "all";
  if (filter === "archived") {
    where.status = "ARCHIVED";
  } else {
    where.deletedAt = null;
    where.status = { not: "ARCHIVED" };
    if (filter === "production") where.environment = "PRODUCTION";
    if (filter === "staging") where.environment = "STAGING";
    if (filter === "development") where.environment = "DEVELOPMENT";
  }

  const search = params.search?.trim();
  if (search) {
    const terms: Prisma.ProjectWhereInput[] = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
    if (UUID_RE.test(search)) {
      terms.push({ id: search });
    }
    where.AND = [{ OR: terms }];
  }

  return where;
}

function orderByFor(
  sort: ListProjectsParams["sort"]
): Prisma.ProjectOrderByWithRelationInput[] {
  switch (sort) {
    case "name":
      return [{ name: "asc" }, { id: "asc" }];
    case "created":
      return [{ createdAt: "desc" }, { id: "desc" }];
    case "updated":
    default:
      return [{ updatedAt: "desc" }, { id: "desc" }];
  }
}

export async function createProject(input: CreateProjectInput) {
  return prisma.project.create({
    data: {
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      mode: input.mode || "BUSINESS",
      environment: input.environment || "DEVELOPMENT",
    },
  });
}

export async function getProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      blueprints: {
        orderBy: { version: "desc" },
        take: 1,
      },
      _count: {
        select: {
          requirements: true,
          features: true,
          agentRuns: true,
          deployments: true,
        },
      },
    },
  });
}

export async function listProjects(
  organizationId: string,
  params: ListProjectsParams = {}
): Promise<ProjectListResponse> {
  const limit = params.limit ?? 20;
  const where = buildProjectWhere(organizationId, params);

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      take: limit + 1,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      skip: params.cursor ? 1 : 0,
      orderBy: orderByFor(params.sort),
      include: {
        _count: {
          select: {
            agentRuns: true,
            requirements: true,
            features: true,
          },
        },
        agentRuns: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { status: true },
        },
        approvals: {
          where: { status: "PENDING" },
          take: 1,
          select: { id: true },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  let nextCursor: string | null = null;
  if (rows.length > limit) {
    // Keep the limit rows we'll actually return; the cursor is the id of the
    // last returned row so the next page resumes right after it (no overlap,
    // no missed rows) given the id is the final tiebreaker in every sort.
    nextCursor = rows[limit - 1].id;
    rows.length = limit;
  }

  const projects: ProjectListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    environment: row.environment as ProjectEnvironment,
    mode: row.mode,
    status: deriveProjectStatus({
      status: row.status,
      deletedAt: row.deletedAt,
      latestRunStatus: row.agentRuns[0]?.status,
      hasPendingApproval: row.approvals.length > 0,
    }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    counts: {
      agentRuns: row._count.agentRuns,
      requirements: row._count.requirements,
      features: row._count.features,
    },
  }));

  return { projects, nextCursor, total };
}

export async function updateProject(projectId: string, input: UpdateProjectInput) {
  return prisma.project.update({
    where: { id: projectId },
    data: input,
  });
}

export async function archiveProject(projectId: string) {
  return prisma.project.update({
    where: { id: projectId },
    data: {
      status: "ARCHIVED",
      deletedAt: new Date(),
    },
  });
}

export async function getProjectWithBlueprint(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      blueprints: {
        orderBy: { version: "desc" },
        take: 1,
      },
      requirements: {
        orderBy: { createdAt: "desc" },
      },
      features: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
