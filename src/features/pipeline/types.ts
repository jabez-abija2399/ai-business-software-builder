import type { ProjectEnvironment } from "../projects/types";

export type PipelineRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "ERROR"
  | "CANCELLED";

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

export interface StageEditorProject {
  id: string;
  name: string;
  description: string | null;
  mode: string;
  environment: ProjectEnvironment;
  /** Owner or org member — the existing access system decides, not the UI. */
  canEdit: boolean;
  /** Project owner only. */
  isOwner: boolean;
}