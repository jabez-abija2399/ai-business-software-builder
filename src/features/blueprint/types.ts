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

/** Loose renderable shape of a persisted blueprint section. */
export interface BlueprintSections {
  businessContext: Record<string, unknown> | null;
  goals: Array<Record<string, unknown>>;
  personas: Array<Record<string, unknown>>;
  roles: Array<Record<string, unknown>>;
  permissions: Array<Record<string, unknown>>;
  features: Array<Record<string, unknown>>;
  entities: Array<Record<string, unknown>>;
  workflows: Array<Record<string, unknown>>;
  businessRules: Array<Record<string, unknown>>;
  integrations: Array<Record<string, unknown>>;
  nfrs: Array<Record<string, unknown>>;
  notes: string | null;
}

export interface BlueprintEditorData {
  project: BlueprintEditorProject;
  latestBlueprint: {
    id: string;
    version: number;
    status: string;
    createdAt: string;
    approvedAt: string | null;
    rawDescription: string | null;
    hasContent: boolean;
    sections: BlueprintSections;
  } | null;
  lastAnalysis: {
    id: string | null;
    status: BlueprintAnalysisStatus;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
    errorCode: string | null;
  } | null;
  versions: {
    version: number;
    status: string;
    createdAt: string;
    approvedAt: string | null;
  }[];
  decisions: {
    id: string;
    decisionKey: string;
    title: string;
    status: string;
    context: string | null;
    decision: string | null;
  }[];
  knownIssues: {
    id: string;
    issueKey: string;
    title: string;
    severity: string;
    status: string;
    description: string | null;
  }[];
}

export interface ClarificationQuestion {
  id: string;
  question: string;
}

export interface BlueprintEditorMode {
  /** 'empty' | 'describe' | 'running' | 'failed' | 'view' | 'clarify' */
  kind: string;
}