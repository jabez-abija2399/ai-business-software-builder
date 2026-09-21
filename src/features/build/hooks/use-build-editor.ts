"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildEditorKey } from "../lib/query-keys";
import { fetchBuildEditor, startBuild } from "../api";
import { IN_FLIGHT_RUN } from "../types";

export { buildEditorKey };

export function useBuildEditor(projectId: string) {
  return useQuery({
    queryKey: buildEditorKey(projectId),
    queryFn: () => fetchBuildEditor(projectId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? [];
      const inflight = runs.some((r) => IN_FLIGHT_RUN.has(r.status));
      return inflight ? 4_000 : false;
    },
    retry: 1,
  });
}

export function useStartBuild(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => startBuild(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: buildEditorKey(projectId),
      });
    },
  });
}