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

/** Human labels for the review agent task types, in pipeline order. */
export const REVIEW_TASK_LABELS: { taskType: string; label: string }[] = [
  { taskType: "GENERATE_README", label: "Documentation" },
  { taskType: "AGENT_REVIEW", label: "Agent review" },
];

export function reviewTaskLabel(taskType: string): string {
  return REVIEW_TASK_LABELS.find((t) => t.taskType === taskType)?.label ?? taskType;
}

export interface ReviewArtifact {
  id: string;
  type: string;
  filePath: string;
  version: number;
  createdAt: string;
  content: string;
  summary: Record<string, unknown> | null;
}

export interface ReviewEditorData {
  project: StageEditorProject;
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  hasCompletedBuild: boolean;
  runs: {
    id: string;
    taskType: string;
    status: PipelineRunStatus;
    createdAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }[];
  artifacts: ReviewArtifact[];
}

export function summarizeReview(data: ReviewEditorData): {
  files: number;
  findings: number;
  errors: number;
  warnings: number;
  infos: number;
  components: number;
  pages: number;
} {
  const readme = data.artifacts.find((a) => a.type === "README");
  const report = data.artifacts.find((a) => a.type === "REVIEW_REPORT");
  const bySeverity = (report?.summary?.bySeverity ?? {}) as Record<string, number>;
  return {
    files: (readme?.summary?.files as number) ?? report?.summary?.files as number ?? 0,
    findings: (report?.summary?.findings as number) ?? 0,
    errors: bySeverity.error ?? 0,
    warnings: bySeverity.warning ?? 0,
    infos: bySeverity.info ?? 0,
    components: (readme?.summary?.components as number) ?? 0,
    pages: (readme?.summary?.pages as number) ?? 0,
  };
}