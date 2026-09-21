import type { ProjectEnvironment } from "../projects/types";

export type BlueprintAnalysisStatus =
  | "QUEUED"
  | "RUNNING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "ERROR"
  | "CANCELLED";

export const IN_FLIGHT_ANALYSIS: ReadonlySet<string> = new Set([
  "QUEUED",
  "RUNNING",
  "IN_PROGRESS",
]);

export const FAILED_ANALYSIS: ReadonlySet<string> = new Set([
  "FAILED",
  "ERROR",
  "CANCELLED",
]);

export interface BlueprintEditorProject {
  id: string;
  name: string;
  description: string | null;
  mode: string;
  environment: ProjectEnvironment;
  canEdit: boolean;
  isOwner: boolean;
}

export interface BlueprintEditorData {
  project: BlueprintEditorProject;
  latestBlueprint: {
    id: string;
    version: number;
    status: string;
    createdAt: string;
    notes: string | null;
    rawDescription: string | null;
    hasRealContent: boolean;
  } | null;
  lastAnalysis: {
    status: BlueprintAnalysisStatus;
    createdAt: string;
    errorMessage: string | null;
  } | null;
}

export type BlueprintEditorMode = "empty" | "describe" | "running" | "failed" | "view";