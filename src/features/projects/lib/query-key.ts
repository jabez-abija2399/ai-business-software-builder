import { buildProjectsQuery } from "../api";
import type { ListProjectsParams } from "../types";

export const PROJECTS_QUERY_KEY = ["projects"] as const;

/**
 * Canonical cache key for a project list. Used by the client hook AND the
 * server-side prefetch so hydration matches exactly.
 */
export function projectsQueryKey(params: ListProjectsParams) {
  return [PROJECTS_QUERY_KEY, "list", buildProjectsQuery(params)] as const;
}