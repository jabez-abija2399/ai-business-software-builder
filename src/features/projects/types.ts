export const PROJECT_ENVIRONMENTS = [
  "DEVELOPMENT",
  "STAGING",
  "PRODUCTION",
] as const;
export type ProjectEnvironment = (typeof PROJECT_ENVIRONMENTS)[number];

export const PROJECT_STATUSES = [
  "ACTIVE",
  "BUILDING",
  "ATTENTION",
  "ERROR",
  "ARCHIVED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_FILTERS = [
  "all",
  "production",
  "staging",
  "development",
  "archived",
] as const;
export type ProjectFilter = (typeof PROJECT_FILTERS)[number];

export const PROJECT_SORTS = ["updated", "created", "name"] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export interface ProjectCounts {
  agentRuns: number;
  requirements: number;
  features: number;
}

/**
 * Serialized, client-safe representation of a project row.
 * Produced by the server data layer; consumed by the React Query hooks.
 */
export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  environment: ProjectEnvironment;
  mode: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  counts: ProjectCounts;
}

export interface ProjectListResponse {
  projects: ProjectListItem[];
  nextCursor: string | null;
  total: number;
}

export interface ListProjectsParams {
  search?: string;
  filter?: ProjectFilter;
  sort?: ProjectSort;
  limit?: number;
  cursor?: string;
}

export interface CreateProjectFormValues {
  name: string;
  description?: string;
  environment: ProjectEnvironment;
}
