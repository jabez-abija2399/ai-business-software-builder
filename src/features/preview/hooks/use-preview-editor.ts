"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { previewEditorKey } from "../lib/query-keys";
import { fetchPreviewEditor, createPreview } from "../api";
import { IN_FLIGHT_DEPLOYMENT } from "../types";

export { previewEditorKey };

export function usePreviewEditor(projectId: string) {
  return useQuery({
    queryKey: previewEditorKey(projectId),
    queryFn: () => fetchPreviewEditor(projectId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const status = query.state.data?.latestPreview?.status;
      return status != null && IN_FLIGHT_DEPLOYMENT.has(status) ? 4_000 : false;
    },
    retry: 1,
  });
}

export function useCreatePreview(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createPreview(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: previewEditorKey(projectId),
      });
    },
  });
}