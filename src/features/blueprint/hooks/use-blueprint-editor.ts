"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  blueprintEditorKey,
  blueprintVersionKey,
} from "../lib/query-keys";
import {
  fetchBlueprintEditor,
  fetchBlueprintVersion,
  startBlueprintAnalysis,
  approveBlueprint,
  submitClarification,
} from "../api";

export { blueprintEditorKey, blueprintVersionKey };

const IN_FLIGHT = new Set(["QUEUED", "RUNNING", "IN_PROGRESS"]);

export function useBlueprintEditor(projectId: string) {
  return useQuery({
    queryKey: blueprintEditorKey(projectId),
    queryFn: () => fetchBlueprintEditor(projectId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const last = query.state.data?.lastAnalysis?.status;
      // Poll only while a real analysis is genuinely in flight.
      return last != null && IN_FLIGHT.has(last) ? 4_000 : false;
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

export function useApproveBlueprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveBlueprint(projectId),
    onSuccess: () => {
      // Approval changes the persisted blueprint + project lifecycle; refetch
      // authoritative server state rather than trusting local mutation.
      void queryClient.invalidateQueries({
        queryKey: blueprintEditorKey(projectId),
      });
    },
  });
}

export function useSubmitClarification(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: string }) =>
      submitClarification(projectId, questionId, answer),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: blueprintEditorKey(projectId),
      });
    },
  });
}

export function useBlueprintVersion(projectId: string, version: number | null) {
  return useQuery({
    queryKey: blueprintVersionKey(projectId, version ?? -1),
    queryFn: () => fetchBlueprintVersion(projectId, version ?? -1),
    enabled: version != null,
    staleTime: 60_000,
    retry: 1,
  });
}