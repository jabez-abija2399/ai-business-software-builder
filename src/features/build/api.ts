import type { BuildEditorData } from "./types";

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

export async function fetchBuildEditor(
  projectId: string
): Promise<BuildEditorData> {
  const res = await fetch(`/api/projects/${projectId}/build/editor`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: BuildEditorData };
  return body.data;
}

export interface StartBuildResult {
  status: string;
  tasksCreated: number;
  message: string;
}

export async function startBuild(projectId: string): Promise<StartBuildResult> {
  const res = await fetch(`/api/projects/${projectId}/build/start`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: StartBuildResult };
  return body.data;
}