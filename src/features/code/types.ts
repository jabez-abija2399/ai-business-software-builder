import type { StageEditorProject, PipelineRunStatus } from "../pipeline/types";

export type WorkspaceFileType =
  | "SOURCE_FILE"
  | "SCHEMA"
  | "TEST"
  | "STYLE"
  | "DOC"
  | "BUILD_LOG"
  | "QUALITY_REPORT";

export interface WorkspaceFile {
  id: string;
  type: string;
  filePath: string;
  checksum: string;
  bytes: number | null;
  createdAt: string;
  /** null when the file has been purged from the workspace on disk. */
  content: string | null;
}

export interface WorkspaceCheck {
  id: string;
  taskType: string;
  status: PipelineRunStatus;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface WorkspaceEditorData {
  project: StageEditorProject;
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  files: WorkspaceFile[];
  sourceCount: number;
  testCount: number;
  hasSchema: boolean;
  checks: WorkspaceCheck[];
  hasCompletedBuild: boolean;
  failedBuildTaskTypes: string[];
  repairAvailable: boolean;
  repairInFlight: boolean;
  publishRun: PublishRun | null;
}

export interface RepairResult {
  status: string;
  tasksCreated: number;
  taskTypes: string[];
  message: string;
}

export interface PublishRun {
  id: string;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface PublishResult {
  status: string;
  runId: string;
  target: string;
  message: string;
}