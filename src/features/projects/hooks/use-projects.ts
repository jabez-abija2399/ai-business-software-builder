"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchProjects } from "../api";
import { PROJECTS_QUERY_KEY, projectsQueryKey } from "../lib/query-key";
import type { ListProjectsParams } from "../types";

export { PROJECTS_QUERY_KEY };

/**
 * Server-paginated, cached, refetch-on-error project list built on
 * @tanstack/react-query. Cursor-based so it scales past hundreds of projects
 * without loading everything into memory. Keeps the previous page while a new
 * search/filter round-trip is in flight for a smooth, flicker-free experience.
 */
export function useProjects(params: ListProjectsParams) {
  return useInfiniteQuery({
    queryKey: projectsQueryKey(params),
    queryFn: ({ pageParam }) =>
      fetchProjects({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: (previousData) => previousData,
  });
}