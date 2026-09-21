import type { StageEditorProject } from "../pipeline/types";

export const IN_FLIGHT_DEPLOYMENT: ReadonlySet<string> = new Set([
  "PENDING",
  "BUILDING",
  "DEPLOYING",
]);

export const READY_DEPLOYMENT: ReadonlySet<string> = new Set([
  "READY",
  "COMPLETED",
  "SUCCESS",
]);

export const FAILED_DEPLOYMENT: ReadonlySet<string> = new Set([
  "FAILED",
  "ERROR",
  "CANCELLED",
]);

export interface PreviewDeployment {
  id: string;
  environment: string;
  provider: string;
  status: string;
  commitRef: string | null;
  deploymentUrl: string | null;
  healthStatus: string | null;
  createdAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface PreviewEditorData {
  project: StageEditorProject;
  blueprint: {
    id: string;
    version: number;
    status: string;
    approvedAt: string | null;
  } | null;
  hasCompletedBuild: boolean;
  latestPreview: PreviewDeployment | null;
  previewHistory: PreviewDeployment[];
}