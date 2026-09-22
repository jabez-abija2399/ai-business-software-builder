export interface UsageStage {
  taskType: string;
  count: number;
  completed: number;
  failed: number;
  avgDurationMs: number | null;
}

export interface UsageDay {
  date: string;
  label: string;
  runs: number;
  deploys: number;
  projects: number;
}

export interface TopProject {
  id: string;
  name: string;
  runCount: number;
}

export interface UsageAnalytics {
  summary: {
    projectCount: number;
    runCount: number;
    deployCount: number;
    completedRunCount: number;
    avgRunDurationMs: number | null;
    readyDeployCount: number;
  };
  /** Daily activity buckets for the last `enabledDaysAgo` days. */
  activity: UsageDay[];
  runsByStage: UsageStage[];
  runsByStatus: Record<string, number>;
  deploysByEnvironment: Record<string, number>;
  topProjects: TopProject[];
  enabledDaysAgo: number;
}