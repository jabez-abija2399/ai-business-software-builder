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