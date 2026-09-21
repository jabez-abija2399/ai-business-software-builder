import type { ProjectEnvironment } from "../../projects/types";

export const PROJECT_OVERVIEW_QUERY_KEY = "project-overview" as const;
export const PROJECT_ACTIVITY_QUERY_KEY = "project-activity" as const;

export type OverviewRangeKey = "24h" | "7d" | "30d" | "90d";

export function projectOverviewKey(projectId: string, range: string) {
  return [PROJECT_OVERVIEW_QUERY_KEY, projectId, range] as const;
}

export function projectActivityKey(projectId: string) {
  return [PROJECT_ACTIVITY_QUERY_KEY, projectId] as const;
}

/**
 * JSON-safe snapshot of a project for the shared ProjectDetailShell (header +
 * navigation). Serially produced by the server layout from the accessible
 * project query so the client never depends on a second fetch.
 */
export interface ProjectShellData {
  id: string;
  name: string;
  description: string | null;
  environment: ProjectEnvironment;
  mode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  blueprintVersion: number | null;
  blueprintStatus: string | null;
  hasDesign: boolean;
  hasRuns: boolean;
  hasQuality: boolean;
  hasDeployments: boolean;
  hasActiveDeployment: boolean;
  requirements: number;
  features: number;
  agentRuns: number;
  deployments: number;
  isArchived: boolean;
}

export type AccessibleProject = {
  id: string;
  name: string;
  description: string | null;
  environment: string;
  mode: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  blueprints: { id: string; version: number; status: string }[];
  deployments: { id: string; status: string; deploymentUrl: string | null; environment: string }[];
  approvals: { id: string; riskLevel: string; summary: string }[];
  testRecords: { id: string }[];
  _count: {
    requirements: number;
    features: number;
    agentRuns: number;
    deployments: number;
    design: number;
  };
};

export function serializeProjectShell(project: AccessibleProject): ProjectShellData {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    environment: project.environment as ProjectEnvironment,
    mode: project.mode,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    blueprintVersion: project.blueprints[0]?.version ?? null,
    blueprintStatus: project.blueprints[0]?.status ?? null,
    hasDesign: project._count.design > 0,
    hasRuns: project._count.agentRuns > 0,
    hasQuality: project.testRecords.length > 0,
    hasDeployments: project._count.deployments > 0,
    hasActiveDeployment: Boolean(project.deployments[0]?.deploymentUrl),
    requirements: project._count.requirements,
    features: project._count.features,
    agentRuns: project._count.agentRuns,
    deployments: project._count.deployments,
    isArchived: project.status === "ARCHIVED" || Boolean(project.deletedAt),
  };
}