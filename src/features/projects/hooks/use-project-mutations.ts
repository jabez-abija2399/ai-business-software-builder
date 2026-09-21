"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { createProjectRequest, deleteProjectRequest, ApiError } from "../api";
import { PROJECTS_QUERY_KEY } from "../lib/query-key";
import type { CreateProjectFormValues, ProjectListItem } from "../types";

interface InfiniteProjects {
  pages: { projects: ProjectListItem[]; total: number }[];
}

function isInfiniteProjects(value: unknown): value is InfiniteProjects {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as InfiniteProjects).pages)
  );
}

export function useCreateProject() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createProjectRequest,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      toast({
        title: "Project created",
        description: `${project.name} is ready to configure.`,
      });
      router.push(`/projects/${project.id}`);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Couldn't create project",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      deleteProjectRequest(id),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: PROJECTS_QUERY_KEY });
      const previous =
        queryClient.getQueriesData<unknown>({ queryKey: PROJECTS_QUERY_KEY });

      queryClient.setQueriesData(
        { queryKey: PROJECTS_QUERY_KEY },
        (old: unknown) => {
          if (!isInfiniteProjects(old)) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              projects: page.projects.filter((project) => project.id !== id),
              total: Math.max(0, page.total - 1),
            })),
          };
        }
      );

      return previous;
    },
    onError: (error: Error, _variables, context) => {
      if (context) {
        for (const [key, value] of context) {
          queryClient.setQueriesData({ queryKey: key }, value);
        }
      }
      toast({
        variant: "destructive",
        title: "Couldn't delete project",
        description: getErrorMessage(error),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
    onSuccess: (_data, { name }) => {
      toast({
        title: "Project deleted",
        description: `${name} was archived.`,
      });
    },
  });
}

function getErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.message) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}