"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { designEditorKey } from "../lib/query-keys";
import { fetchDesignEditor, startDesignGeneration } from "../api";
import { IN_FLIGHT_RUN } from "../types";

export { designEditorKey };

export function useDesignEditor(projectId: string) {
  return useQuery({
    queryKey: designEditorKey(projectId),
    queryFn: () => fetchDesignEditor(projectId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const status = query.state.data?.lastDesignRun?.status;
      return status != null && IN_FLIGHT_RUN.has(status) ? 4_000 : false;
    },
    retry: 1,
  });
}

export function useStartDesignGeneration(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => startDesignGeneration(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: designEditorKey(projectId),
      });
    },
  });
}