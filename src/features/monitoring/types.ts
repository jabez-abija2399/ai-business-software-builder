import type { StageEditorProject } from "../pipeline/types";

export type HealthStatus = "UP" | "DOWN" | "PROVISIONING" | "UNKNOWN";

/** One genuine AgentRun row, summarized for monitoring views. */
export interface RunSummary {
  id: string;
  projectId: string;
  projectName: string;
  taskType: string;
  agentType: string;
  status: string;
  provider: string | null;
  model: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

/** One genuine Deployment row, including real health-check state. */
export interface DeploymentSummary {
  id: string;
  projectId: string;
  projectName: string;
  environment: string;
  provider: string;
  status: string;
  deploymentUrl: string | null;
  healthStatus: string | null;
  healthCheckedAt: string | null;
  createdAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AuditSummary {
  id: string;
  action: string;
  entityType: string;
  projectId: string | null;
  projectName: string | null;
  createdAt: string;
}

export interface MonitoringSummaryCounts {
  projectCount: number;
  runCount: number;
  deployCount: number;
  runsByStatus: Record<string, number>;
  deploysByStatus: Record<string, number>;
  failedRuns24h: number;
  readyDeployCount: number;
  upDeployCount: number;
  avgRunDurationMs: number | null;
}

export interface PlatformMonitoring {
  summary: MonitoringSummaryCounts;
  recentRuns: RunSummary[];
  recentDeployments: DeploymentSummary[];
  recentAudit: AuditSummary[];
}

export interface StageHealth {
  taskType: string;
  run: RunSummary | null;
}

export interface ProjectHealthDeployment {
  environment: string;
  latest: Omit<DeploymentSummary, "projectId" | "projectName"> | null;
}

export interface ProjectHealth {
  project: StageEditorProject;
  stages: StageHealth[];
  deployments: ProjectHealthDeployment[];
}