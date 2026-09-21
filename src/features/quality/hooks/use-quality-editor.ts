"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qualityEditorKey } from "../lib/query-keys";
import { fetchQualityEditor, runQuality } from "../api";
import { IN_FLIGHT_RUN } from "../types";

export { qualityEditorKey };

export function useQualityEditor(projectId: string) {
  return useQuery({
    queryKey: qualityEditorKey(projectId),
    queryFn: () => fetchQualityEditor(projectId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? [];
      return runs.some((r) => IN_FLIGHT_RUN.has(r.status)) ? 4_000 : false;
    },
    retry: 1,
  });
}

export function useRunQuality(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runQuality(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: qualityEditorKey(projectId),
      });
    },
  });
}