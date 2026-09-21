import type { ProjectEnvironment, ProjectStatus } from "../types";

export interface ProjectStatusMeta {
  label: string;
  /** Background class for the status dot (semantic token). */
  dotClass: string;
  /** Screen-reader / title description. */
  description: string;
}

export const PROJECT_STATUS_META: Record<ProjectStatus, ProjectStatusMeta> = {
  ACTIVE: {
    label: "Active",
    dotClass: "bg-success",
    description: "Healthy and running normally",
  },
  BUILDING: {
    label: "Building",
    dotClass: "bg-info",
    description: "An AI job is currently running",
  },
  ATTENTION: {
    label: "Attention required",
    dotClass: "bg-warning",
    description: "Waiting on an approval or decision",
  },
  ERROR: {
    label: "Error",
    dotClass: "bg-destructive",
    description: "The most recent run failed",
  },
  ARCHIVED: {
    label: "Archived",
    dotClass: "bg-muted-foreground/40",
    description: "Archived project",
  },
};

export interface ProjectEnvironmentMeta {
  label: string;
  short: string;
}

export const PROJECT_ENVIRONMENT_META: Record<
  ProjectEnvironment,
  ProjectEnvironmentMeta
> = {
  DEVELOPMENT: { label: "Development", short: "Dev" },
  STAGING: { label: "Staging", short: "Staging" },
  PRODUCTION: { label: "Production", short: "Prod" },
};
