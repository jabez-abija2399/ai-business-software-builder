/**
 * Loads the real persisted context each worker handler needs. Everything here
 * reads from Postgres (blueprints, design artifacts, generated files) — handlers
 * never invent inputs.
 */

import prisma from "@/lib/prisma";
import { readWorkspaceFile } from "./workspace";
import type { BlueprintSpec, DesignGeneration } from "../ai/types";

export interface BlueprintContext {
  id: string;
  version: number;
  status: string;
  spec: BlueprintSpec;
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? (value.filter((v) => v && typeof v === "object") as Array<Record<string, unknown>>)
    : [];
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const EMPTY_SPEC: BlueprintSpec = {
  businessContext: null,
  goals: [],
  personas: [],
  roles: [],
  permissions: [],
  features: [],
  entities: [],
  workflows: [],
  businessRules: [],
  integrations: [],
  nfrs: [],
};

export function emptySpec(): BlueprintSpec {
  return EMPTY_SPEC;
}

export async function loadBlueprintContext(
  projectId: string,
  options: { approvedOnly?: boolean } = {}
): Promise<BlueprintContext | null> {
  const bp = await prisma.businessBlueprint.findFirst({
    where: options.approvedOnly ? { projectId, status: "APPROVED" } : { projectId },
    orderBy: { version: "desc" },
  });
  if (!bp) return null;

  return {
    id: bp.id,
    version: bp.version,
    status: bp.status,
    spec: {
      businessContext: asObject(bp.businessContextJson),
      goals: asArray(bp.goalsJson),
      personas: asArray(bp.personasJson),
      roles: asArray(bp.rolesJson),
      permissions: asArray(bp.permissionsJson),
      features: asArray(bp.featuresJson),
      entities: asArray(bp.entitiesJson),
      workflows: asArray(bp.workflowsJson),
      businessRules: asArray(bp.businessRulesJson),
      integrations: asArray(bp.integrationsJson),
      nfrs: asArray(bp.nfrJson),
    },
  };
}

export async function loadDesign(projectId: string): Promise<DesignGeneration | null> {
  const design = await prisma.designArtifact.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });
  if (!design) return null;
  return {
    tokens: asObject(design.tokensJson) ?? {},
    components: asArray(design.componentsJson),
    pages: asArray(design.pagesJson),
    states: asArray(design.statesJson),
    responsiveRules: asArray(design.responsiveRulesJson),
  };
}

export interface GeneratedFileRecord {
  id: string;
  filePath: string;
  type: string;
  contentRef: string;
  content: string;
}

const GENERATED_TYPES = ["SOURCE_FILE", "SCHEMA", "TEST", "STYLE", "DOC"];

/** Reads generated files from the workspace, newest version per path. */
export async function loadGeneratedFiles(projectId: string): Promise<GeneratedFileRecord[]> {
  const artifacts = await prisma.projectArtifact.findMany({
    where: { projectId, type: { in: GENERATED_TYPES } },
    orderBy: { createdAt: "desc" },
    take: 400,
  });

  const byPath = new Map<string, GeneratedFileRecord>();
  for (const artifact of artifacts) {
    if (byPath.has(artifact.filePath)) continue;
    const content = (await readWorkspaceFile(projectId, artifact.contentRef)) ?? "";
    byPath.set(artifact.filePath, {
      id: artifact.id,
      filePath: artifact.filePath,
      type: artifact.type,
      contentRef: artifact.contentRef,
      content,
    });
  }
  return Array.from(byPath.values());
}
