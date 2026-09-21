"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { codeEditorKey } from "../lib/query-keys";
import { fetchCodeEditor, repairFailedTasks } from "../api";
import { IN_FLIGHT_RUN } from "../../pipeline/types";

export { codeEditorKey };

export function useCodeEditor(projectId: string) {
  return useQuery({
    queryKey: codeEditorKey(projectId),
    queryFn: () => fetchCodeEditor(projectId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      const inflight =
        (data?.repairInFlight ?? false) ||
        data?.checks.some((c) => IN_FLIGHT_RUN.has(c.status));
      return inflight ? 4_000 : false;
    },
    retry: 1,
  });
}

export function useRepairFailedTasks(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => repairFailedTasks(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: codeEditorKey(projectId) });
    },
  });
}