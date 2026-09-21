import type { PipelineRunStatus, StageEditorProject } from "../pipeline/types";

export type { PipelineRunStatus, StageEditorProject };

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

export interface DesignEditorData {
  project: StageEditorProject;
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  lastDesignRun: {
    id: string | null;
    status: PipelineRunStatus;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
    errorCode: string | null;
  } | null;
  latestDesign: {
    id: string;
    version: number;
    status: string;
    hasContent: boolean;
    tokens: Record<string, unknown> | null;
    components: Array<Record<string, unknown>>;
    pages: Array<Record<string, unknown>>;
    states: Array<Record<string, unknown>>;
    responsiveRules: Array<Record<string, unknown>>;
  } | null;
  designVersions: {
    version: number;
    status: string;
    createdAt: string;
  }[];
}