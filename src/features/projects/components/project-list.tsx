"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectRow } from "./project-row";
import type { ProjectListItem } from "../types";

interface ProjectListProps {
  projects: ProjectListItem[];
  total: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function ProjectList({
  projects,
  total,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: ProjectListProps) {
  return (
    <div className="pb-2">
      <div className="px-0.5 pb-2 pt-8 text-[13px] text-muted-foreground">
        {total} {total === 1 ? "project" : "projects"}
      </div>

      <ul className="space-y-2">
        {projects.map((project) => (
          <li key={project.id} className="list-none">
            <ProjectRow project={project} />
          </li>
        ))}
      </ul>

      {hasNextPage && (
        <div className="pt-3 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}