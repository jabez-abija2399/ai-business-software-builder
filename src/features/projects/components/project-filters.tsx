"use client";

import {
  PROJECT_FILTERS,
  type ProjectFilter,
  type ProjectSort,
} from "../types";
import type { ProjectFilters } from "../hooks/use-project-filters";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FILTER_LABELS: Record<ProjectFilter, string> = {
  all: "All",
  production: "Production",
  staging: "Staging",
  development: "Development",
  archived: "Archived",
};

export const SORT_LABELS: Record<ProjectSort, string> = {
  updated: "Recently updated",
  created: "Newest",
  name: "Name",
};

function FilterPills({ filters }: { filters: ProjectFilters }) {
  return (
    <div
      role="group"
      aria-label="Filter projects by environment or status"
      className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
    >
      {PROJECT_FILTERS.map((filter) => {
        const active = filters.filter === filter;
        return (
          <button
            key={filter}
            type="button"
            onClick={() => filters.setFilter(filter)}
            aria-pressed={active}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              active
                ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {FILTER_LABELS[filter]}
          </button>
        );
      })}
    </div>
  );
}

function SortSelect({ filters }: { filters: ProjectFilters }) {
  return (
    <Select
      value={filters.sort}
      onValueChange={(value) => filters.setSort(value as ProjectSort)}
    >
      <SelectTrigger
        aria-label="Sort projects"
        className="h-9 w-[168px] text-[13px]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProjectFilters({ filters }: { filters: ProjectFilters }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="overflow-x-auto pb-0.5">
        <FilterPills filters={filters} />
      </div>
      <SortSelect filters={filters} />
    </div>
  );
}