import type { BlueprintEditorData } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string; code?: string };
    };
    return new ApiError(
      body.error?.message ?? `Request failed (${response.status})`,
      response.status,
      body.error?.code
    );
  } catch {
    return new ApiError(`Request failed (${response.status})`, response.status);
  }
}

export async function fetchBlueprintEditor(
  projectId: string
): Promise<BlueprintEditorData> {
  const res = await fetch(`/api/projects/${projectId}/blueprint/editor`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: BlueprintEditorData };
  return body.data;
}

export interface AnalyzeResult {
  status: string;
  runId: string;
  blueprintId: string;
  version: number;
}

export async function startBlueprintAnalysis(
  projectId: string,
  businessDescription: string
): Promise<AnalyzeResult> {
  const res = await fetch(`/api/projects/${projectId}/blueprint/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ businessDescription }),
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: AnalyzeResult };
  return body.data;
}

/** Full persisted content of a specific blueprint version (read-only). */
export interface BlueprintVersionData {
  id: string;
  projectId: string;
  version: number;
  status: string;
  businessContextJson: Record<string, unknown> | null;
  goalsJson: Array<Record<string, unknown>>;
  personasJson: Array<Record<string, unknown>>;
  rolesJson: Array<Record<string, unknown>>;
  permissionsJson: Array<Record<string, unknown>>;
  featuresJson: Array<Record<string, unknown>>;
  entitiesJson: Array<Record<string, unknown>>;
  workflowsJson: Array<Record<string, unknown>>;
  businessRulesJson: Array<Record<string, unknown>>;
  integrationsJson: Array<Record<string, unknown>>;
  nfrJson: Array<Record<string, unknown>>;
  notes: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export async function fetchBlueprintVersion(
  projectId: string,
  version: number
): Promise<BlueprintVersionData | null> {
  const res = await fetch(
    `/api/projects/${projectId}/blueprint?version=${version}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: BlueprintVersionData | null };
  return body.data;
}

export interface ApproveResult {
  status: string;
  blueprintId: string;
}

export async function approveBlueprint(
  projectId: string
): Promise<ApproveResult> {
  const res = await fetch(`/api/projects/${projectId}/blueprint/approve`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: ApproveResult };
  return body.data;
}

export interface ClarifyResult {
  blueprintId: string;
  version: number;
  answered: number;
  pending: number;
  message: string;
}

export async function submitClarification(
  projectId: string,
  questionId: string,
  answer: string
): Promise<ClarifyResult> {
  const res = await fetch(`/api/projects/${projectId}/blueprint/clarify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ answers: [{ questionId, answer }] }),
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: ClarifyResult };
  return body.data;
}