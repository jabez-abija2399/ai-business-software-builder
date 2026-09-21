"use client";

import { useState } from "react";
import { useProjectFilters } from "../hooks/use-project-filters";
import { useProjects } from "../hooks/use-projects";
import { ProjectsHeader } from "./projects-header";
import { ProjectSearch } from "./project-search";
import { ProjectFilters } from "./project-filters";
import { ProjectList } from "./project-list";
import { ProjectListSkeleton } from "./project-skeleton";
import { ProjectEmptyState } from "./project-empty-state";
import { ProjectNoResults } from "./project-no-results";
import { ProjectErrorState } from "./project-error-state";
import { CreateProjectModal } from "./create-project-modal";

export function ProjectsPage() {
  const filters = useProjectFilters();
  const [createOpen, setCreateOpen] = useState(false);

  const query = useProjects({
    search: filters.searchQuery,
    filter: filters.filter,
    sort: filters.sort,
    limit: 20,
  });

  const data = query.data;
  const projects = data?.pages.flatMap((page) => page.projects) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const firstLoad = query.isPending && !data;
  const hasProjects = projects.length > 0;
  const showToolbar = hasProjects || (Boolean(data) && filters.isFiltered);

  function clearFilters() {
    filters.reset();
  }

  let content: React.ReactNode;
  if (firstLoad) {
    content = <ProjectListSkeleton />;
  } else if (query.isError && !data) {
    content = (
      <ProjectErrorState onRetry={() => query.refetch()} error={query.error} />
    );
  } else if (!hasProjects) {
    content = filters.isFiltered ? (
      <ProjectNoResults onClear={clearFilters} />
    ) : (
      <ProjectEmptyState onCreate={() => setCreateOpen(true)} />
    );
  } else {
    content = (
      <ProjectList
        projects={projects}
        total={total}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        onLoadMore={() => query.fetchNextPage()}
      />
    );
  }

  return (
    <div className="pb-10">
      <ProjectsHeader onCreate={() => setCreateOpen(true)} />

      {showToolbar && (
        <div className="mt-7 space-y-3">
          <ProjectSearch filters={filters} />
          <ProjectFilters filters={filters} />
        </div>
      )}

      {content}

      <CreateProjectModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}