"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deployEditorKey } from "../lib/query-keys";
import { fetchDeployEditor, createDeployment } from "../api";
import { IN_FLIGHT_DEPLOYMENT } from "../types";

export { deployEditorKey };

export function useDeployEditor(projectId: string) {
  return useQuery({
    queryKey: deployEditorKey(projectId),
    queryFn: () => fetchDeployEditor(projectId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const deployments = query.state.data?.deployments ?? [];
      return deployments.some((d) => IN_FLIGHT_DEPLOYMENT.has(d.status)) ? 4_000 : false;
    },
    retry: 1,
  });
}

export function useCreateDeployment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (environment: "staging" | "production") => createDeployment(projectId, environment),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: deployEditorKey(projectId),
      });
    },
  });
}