import prisma from "@/lib/prisma";
import type { BusinessBlueprintWhereInput, BusinessBlueprintUpdateInput } from "@/types/prisma";
import { Prisma } from "@prisma/client";

export interface CreateBlueprintInput {
  projectId: string;
  createdBy: string;
  businessContext?: Record<string, unknown>;
  goals?: Record<string, unknown>[];
  personas?: Record<string, unknown>[];
  roles?: Record<string, unknown>[];
  permissions?: Record<string, unknown>[];
  features?: Record<string, unknown>[];
  entities?: Record<string, unknown>[];
  workflows?: Record<string, unknown>[];
  businessRules?: Record<string, unknown>[];
  integrations?: Record<string, unknown>[];
  nfrs?: Record<string, unknown>[];
}

export interface UpdateBlueprintInput {
  status?: string;
  businessContext?: Record<string, unknown>;
  goals?: Record<string, unknown>[];
  personas?: Record<string, unknown>[];
  roles?: Record<string, unknown>[];
  permissions?: Record<string, unknown>[];
  features?: Record<string, unknown>[];
  entities?: Record<string, unknown>[];
  workflows?: Record<string, unknown>[];
  businessRules?: Record<string, unknown>[];
  integrations?: Record<string, unknown>[];
  nfrs?: Record<string, unknown>[];
  notes?: string;
}

async function getNextVersion(projectId: string): Promise<number> {
  const latest = await prisma.businessBlueprint.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  return (latest?.version || 0) + 1;
}

export async function createBlueprint(input: CreateBlueprintInput) {
  const version = await getNextVersion(input.projectId);

  return prisma.businessBlueprint.create({
    data: {
      projectId: input.projectId,
      version,
      createdBy: input.createdBy,
      businessContextJson: (input.businessContext || {}) as unknown as Prisma.InputJsonValue,
      goalsJson: (input.goals || []) as unknown as Prisma.InputJsonValue,
      personasJson: (input.personas || []) as unknown as Prisma.InputJsonValue,
      rolesJson: (input.roles || []) as unknown as Prisma.InputJsonValue,
      permissionsJson: (input.permissions || []) as unknown as Prisma.InputJsonValue,
      featuresJson: (input.features || []) as unknown as Prisma.InputJsonValue,
      entitiesJson: (input.entities || []) as unknown as Prisma.InputJsonValue,
      workflowsJson: (input.workflows || []) as unknown as Prisma.InputJsonValue,
      businessRulesJson: (input.businessRules || []) as unknown as Prisma.InputJsonValue,
      integrationsJson: (input.integrations || []) as unknown as Prisma.InputJsonValue,
      nfrJson: (input.nfrs || []) as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function getBlueprint(projectId: string, version?: number) {
  const where: BusinessBlueprintWhereInput = { projectId };
  if (version) {
    where.version = version;
  }

  return prisma.businessBlueprint.findFirst({
    where,
    orderBy: { version: "desc" },
  });
}

export async function getBlueprintById(blueprintId: string) {
  return prisma.businessBlueprint.findUnique({
    where: { id: blueprintId },
    include: {
      project: true,
      requirements: true,
      features: true,
    },
  });
}

export async function listBlueprints(projectId: string) {
  return prisma.businessBlueprint.findMany({
    where: { projectId },
    orderBy: { version: "desc" },
  });
}

export async function updateBlueprint(blueprintId: string, input: UpdateBlueprintInput) {
  const data: BusinessBlueprintUpdateInput = {};

  if (input.status) data.status = input.status;
  if (input.businessContext) data.businessContextJson = input.businessContext as unknown as Prisma.InputJsonValue;
  if (input.goals) data.goalsJson = input.goals as unknown as Prisma.InputJsonValue;
  if (input.personas) data.personasJson = input.personas as unknown as Prisma.InputJsonValue;
  if (input.roles) data.rolesJson = input.roles as unknown as Prisma.InputJsonValue;
  if (input.permissions) data.permissionsJson = input.permissions as unknown as Prisma.InputJsonValue;
  if (input.features) data.featuresJson = input.features as unknown as Prisma.InputJsonValue;
  if (input.entities) data.entitiesJson = input.entities as unknown as Prisma.InputJsonValue;
  if (input.workflows) data.workflowsJson = input.workflows as unknown as Prisma.InputJsonValue;
  if (input.businessRules) data.businessRulesJson = input.businessRules as unknown as Prisma.InputJsonValue;
  if (input.integrations) data.integrationsJson = input.integrations as unknown as Prisma.InputJsonValue;
  if (input.nfrs) data.nfrJson = input.nfrs as unknown as Prisma.InputJsonValue;
  if (input.notes !== undefined) data.notes = input.notes;

  return prisma.businessBlueprint.update({
    where: { id: blueprintId },
    data,
  });
}

export async function approveBlueprint(blueprintId: string, approvedBy: string) {
  return prisma.businessBlueprint.update({
    where: { id: blueprintId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy,
    },
  });
}

export async function getLatestApprovedBlueprint(projectId: string) {
  return prisma.businessBlueprint.findFirst({
    where: {
      projectId,
      status: "APPROVED",
    },
    orderBy: { version: "desc" },
  });
}
