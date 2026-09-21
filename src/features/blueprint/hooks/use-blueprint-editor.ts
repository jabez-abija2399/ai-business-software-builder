"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { blueprintEditorKey } from "../lib/query-keys";
import { fetchBlueprintEditor, startBlueprintAnalysis } from "../api";

export { blueprintEditorKey };

export function useBlueprintEditor(projectId: string) {
  return useQuery({
    queryKey: blueprintEditorKey(projectId),
    queryFn: () => fetchBlueprintEditor(projectId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const last = query.state.data?.lastAnalysis?.status;
      // Poll only while a real analysis is genuinely in flight.
      return last === "QUEUED" || last === "RUNNING" || last === "IN_PROGRESS"
        ? 4_000
        : false;
    },
    retry: 1,
  });
}

export function useStartBlueprintAnalysis(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (businessDescription: string) =>
      startBlueprintAnalysis(projectId, businessDescription),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: blueprintEditorKey(projectId),
      });
    },
  });
}