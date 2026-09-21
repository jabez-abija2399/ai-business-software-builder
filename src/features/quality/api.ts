import type { QualityEditorData } from "./types";

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

export async function fetchQualityEditor(
  projectId: string
): Promise<QualityEditorData> {
  const res = await fetch(`/api/projects/${projectId}/quality/editor`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: QualityEditorData };
  return body.data;
}

export interface RunQualityResult {
  status: string;
  tasksCreated: number;
  message: string;
}

export async function runQuality(projectId: string): Promise<RunQualityResult> {
  const res = await fetch(`/api/projects/${projectId}/quality/run`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: RunQualityResult };
  return body.data;
}