import type { ProjectEnvironment, ProjectStatus } from "../projects/types";

export const OVERVIEW_RANGES = ["24h", "7d", "30d", "90d"] as const;
export type OverviewRange = (typeof OVERVIEW_RANGES)[number];

export const OVERVIEW_CHART_METRICS = ["runs", "tokens", "cost", "latency"] as const;
export type OverviewChartMetric = (typeof OVERVIEW_CHART_METRICS)[number];

export interface ProjectOverviewProject {
  id: string;
  name: string;
  description: string | null;
  environment: ProjectEnvironment;
  mode: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SetupStep {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
  href: string;
}

export interface Lifecycle {
  hasBlueprint: boolean;
  blueprintVersion: number | null;
  blueprintStatus: string | null;
  hasDesign: boolean;
  hasRuns: boolean;
  hasQuality: boolean;
  hasDeployments: boolean;
  hasActiveDeployment: boolean;
}

export interface OverviewMetrics {
  runs: number;
  runsDeltaPct: number | null;
  tokens: number | null;
  tokensDeltaPct: number | null;
  spend: number | null;
  spendDeltaPct: number | null;
  latencyMs: number | null;
  latencyDeltaPct: number | null;
  errorRatePct: number | null;
  errorRateDeltaPct: number | null;
  requirements: number;
  features: number;
  deployments: number;
}

export interface HealthState {
  level: "operational" | "building" | "attention" | "degraded" | "incomplete";
  title: string;
  subtitle: string;
}

export interface OverviewSeriesPoint {
  /** ISO date of the bucket (start). */
  date: string;
  /** Short human label for the axis. */
  label: string;
  runs: number;
  deployments: number;
  errors: number;
  tokens: number;
  cost: number;
  latencyMs: number | null;
}

export interface ProviderActivity {
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
}

export interface ModelActivity {
  model: string;
  requests: number;
  tokens: number;
  cost: number;
  latencyMs: number | null;
}

export interface ActivityItem {
  id: string;
  type: "run" | "deployment" | "approval" | "decision";
  title: string;
  subtitle: string;
  status: string;
  at: string;
  href: string;
}

export interface AttentionItem {
  severity: "error" | "warning" | "info";
  title: string;
  detail: string;
  count: number;
  lastAt: string | null;
  actionLabel: string;
  actionHref: string;
}

/**
 * Analytics payload for the Overview screen. Every value is derived from real
 * project data — nothing is fabricated. Absent fields are `null`/empty so the
 * UI can render "—" or an appropriate empty state instead of fake numbers.
 */
export interface ProjectOverviewData {
  project: ProjectOverviewProject;
  lifecycle: Lifecycle;
  setup: SetupStep[];
  health: HealthState;
  metrics: OverviewMetrics;
  series: OverviewSeriesPoint[];
  providers: ProviderActivity[];
  models: ModelActivity[];
  attention: AttentionItem[];
  updatedAt: string;
}

export interface ProjectActivityItem {
  id: string;
  type: ActivityItem["type"];
  title: string;
  subtitle: string;
  status: string;
  at: string;
  href: string;
}

/**
 * Recent-activity payload (fetched independently of analytics so a failed
 * aggregation never hides request-level activity).
 */
export interface ProjectActivityData {
  items: ProjectActivityItem[];
  total: number;
  updatedAt: string;
}