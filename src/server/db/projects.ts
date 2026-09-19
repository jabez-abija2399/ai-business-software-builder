import prisma from "@/lib/prisma";
import type { ProjectWhereInput, ProjectUpdateInput } from "@/types/prisma";

export interface CreateProjectInput {
  organizationId: string;
  ownerId: string;
  name: string;
  description?: string;
  mode?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  mode?: string;
  status?: string;
}

export async function createProject(input: CreateProjectInput) {
  return prisma.project.create({
    data: {
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      mode: input.mode || "BUSINESS",
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
  options?: {
    status?: string;
    limit?: number;
    cursor?: string;
  }
) {
  const limit = options?.limit || 20;
  const where: ProjectWhereInput = {
    organizationId,
    deletedAt: null,
  };

  if (options?.status) {
    where.status = options.status;
  }

  const projects = await prisma.project.findMany({
    where,
    take: limit + 1,
    cursor: options?.cursor ? { id: options.cursor } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          requirements: true,
          features: true,
        },
      },
    },
  });

  let nextCursor: string | undefined;
  if (projects.length > limit) {
    const nextItem = projects.pop();
    nextCursor = nextItem?.id;
  }

  return {
    projects,
    nextCursor,
  };
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
