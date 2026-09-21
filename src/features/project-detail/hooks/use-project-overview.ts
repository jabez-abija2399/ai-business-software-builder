"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProjectActivity, fetchProjectOverview } from "../api";
import {
  projectActivityKey,
  projectOverviewKey,
} from "../lib/shell";
import type { OverviewRange } from "../types";

export { projectOverviewKey, projectActivityKey };

export function useProjectOverview(projectId: string, range: OverviewRange) {
  return useQuery({
    queryKey: projectOverviewKey(projectId, range),
    queryFn: () => fetchProjectOverview(projectId, range),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
    retry: 1,
  });
}

export function useProjectActivity(projectId: string) {
  return useQuery({
    queryKey: projectActivityKey(projectId),
    queryFn: () => fetchProjectActivity(projectId),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
    retry: 1,
  });
}