import type { PipelineRunStatus, StageEditorProject } from "../pipeline/types";

export const IN_FLIGHT_RUN: ReadonlySet<string> = new Set([
  "QUEUED",
  "RUNNING",
  "IN_PROGRESS",
]);

export const FAILED_RUN: ReadonlySet<string> = new Set([
  "FAILED",
  "ERROR",
  "CANCELLED",
]);

/** Human labels for the canonical build task types, in pipeline order. */
export const BUILD_TASK_LABELS: { taskType: string; label: string }[] = [
  { taskType: "SCAFFOLD_PROJECT", label: "Scaffold project" },
  { taskType: "GENERATE_COMPONENTS", label: "Generate components" },
  { taskType: "GENERATE_PAGES", label: "Generate pages" },
  { taskType: "GENERATE_API_ROUTES", label: "Generate API routes" },
  { taskType: "GENERATE_DATABASE", label: "Generate database schema" },
  { taskType: "GENERATE_TESTS", label: "Generate tests" },
  { taskType: "GENERATE_STYLES", label: "Generate styles" },
  { taskType: "INSTALL_DEPENDENCIES", label: "Install dependencies" },
  { taskType: "RUN_LINT", label: "Run lint" },
  { taskType: "RUN_TYPECHECK", label: "Run typecheck" },
];

export function buildTaskLabel(taskType: string): string {
  return BUILD_TASK_LABELS.find((t) => t.taskType === taskType)?.label ?? taskType;
}

export interface BuildEditorData {
  project: StageEditorProject;
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  runs: {
    id: string;
    taskType: string;
    status: PipelineRunStatus;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
  }[];
  artifacts: {
    id: string;
    type: string;
    version: number;
    filePath: string;
    createdAt: string;
  }[];
  hasCompletedBuild: boolean;
}