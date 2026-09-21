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

/** Human labels for the canonical quality check types, in pipeline order. */
export const QUALITY_TASK_LABELS: { taskType: string; label: string }[] = [
  { taskType: "TESTS", label: "Tests" },
  { taskType: "SECURITY", label: "Security" },
  { taskType: "ACCESSIBILITY", label: "Accessibility" },
  { taskType: "PERFORMANCE", label: "Performance" },
];

export function qualityTaskLabel(taskType: string): string {
  return QUALITY_TASK_LABELS.find((t) => t.taskType === taskType)?.label ?? taskType;
}

export interface QualityTestRecord {
  id: string;
  testType: string;
  name: string;
  status: string;
  durationMs: number | null;
  errorMessage: string | null;
  commandRef: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface QualityEditorData {
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
  testRecords: QualityTestRecord[];
}

/** Aggregates computed only from real test records — never a fabricated score. */
export interface QualitySummary {
  total: number;
  passed: number;
  failed: number;
  other: number;
  byType: { testType: string; label: string; total: number; passed: number; failed: number }[];
}

export function summarizeQuality(records: QualityTestRecord[]): QualitySummary {
  const passed = records.filter((r) => r.status === "PASSED").length;
  const failed = records.filter((r) => r.status === "FAILED").length;

  return {
    total: records.length,
    passed,
    failed,
    other: records.length - passed - failed,
    byType: QUALITY_TASK_LABELS.map(({ taskType, label }) => {
      const ofType = records.filter((r) => r.testType === taskType);
      return {
        testType: taskType,
        label,
        total: ofType.length,
        passed: ofType.filter((r) => r.status === "PASSED").length,
        failed: ofType.filter((r) => r.status === "FAILED").length,
      };
    }),
  };
}