"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reviewEditorKey } from "../lib/query-keys";
import { fetchReviewEditor, runReview } from "../api";
import { IN_FLIGHT_RUN } from "../types";

export { reviewEditorKey };

export function useReviewEditor(projectId: string) {
  return useQuery({
    queryKey: reviewEditorKey(projectId),
    queryFn: () => fetchReviewEditor(projectId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? [];
      return runs.some((r) => IN_FLIGHT_RUN.has(r.status)) ? 4_000 : false;
    },
    retry: 1,
  });
}

export function useRunReview(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runReview(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: reviewEditorKey(projectId),
      });
    },
  });
}