"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProjectAvatar } from "./project-avatar";
import { ProjectStatus } from "./project-status";
import { ProjectMenu } from "./project-menu";
import { PROJECT_ENVIRONMENT_META } from "../lib/project-meta";
import { formatCompactNumber, formatTimeAgo, formatAbsolute } from "../lib/format";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "../types";

function MetaCell({
  label,
  value,
  mono = false,
  suppressHydrationWarning = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  suppressHydrationWarning?: boolean;
}) {
  return (
    <div className="w-28 text-right">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        suppressHydrationWarning={suppressHydrationWarning}
        className={cn(
          "mt-0.5 text-[13px] text-foreground",
          mono && "font-mono text-[12px]"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function ProjectRow({ project }: { project: ProjectListItem }) {
  const environment = PROJECT_ENVIRONMENT_META[project.environment];
  const subtitle =
    project.description?.trim() ||
    `Created ${formatTimeAgo(project.createdAt)}`;
  const lastActive = formatTimeAgo(project.updatedAt);
  const runs = formatCompactNumber(project.counts.agentRuns);

  return (
    <div className="group relative rounded-xl border bg-card transition-[border-color,background-color] duration-150 hover:border-border hover:bg-accent/40">
      <Link
        href={`/projects/${project.id}`}
        aria-label={`Open ${project.name}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      />

      <div className="pointer-events-none relative z-[1] flex items-center gap-4 px-4 py-3.5">
        <ProjectAvatar seed={project.id} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-medium text-foreground">
              {project.name}
            </h3>
            <span className="hidden font-mono text-[11px] text-muted-foreground lg:inline">
              {project.id.slice(0, 8)}
            </span>
          </div>
          <p
            suppressHydrationWarning
            className="mt-0.5 truncate text-[13px] text-muted-foreground"
          >
            {subtitle}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground lg:hidden">
            <span>{environment.label}</span>
            <span aria-hidden className="text-muted-foreground/50">
              ·
            </span>
            <span>
              <span className="font-mono text-[12px]">{runs}</span> runs
            </span>
            <span aria-hidden className="text-muted-foreground/50">
              ·
            </span>
            <span suppressHydrationWarning title={formatAbsolute(project.updatedAt)}>
              {lastActive}
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-6 lg:flex">
          <MetaCell label="Environment" value={environment.label} />
          <MetaCell label="AI runs" value={runs} mono />
          <MetaCell
            label="Last active"
            value={lastActive}
            suppressHydrationWarning
          />
        </div>

        <div className="pointer-events-auto ml-2 flex shrink-0 items-center gap-2">
          <ProjectStatus status={project.status} />
          <ArrowRight
            className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            aria-hidden
          />
          <ProjectMenu project={project} />
        </div>
      </div>
    </div>
  );
}