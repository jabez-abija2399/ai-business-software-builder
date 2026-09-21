import type { RepairResult, WorkspaceEditorData } from "./types";

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

export async function fetchCodeEditor(projectId: string): Promise<WorkspaceEditorData> {
  const res = await fetch(`/api/projects/${projectId}/code/editor`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: WorkspaceEditorData };
  return body.data;
}

export async function repairFailedTasks(projectId: string): Promise<RepairResult> {
  const res = await fetch(`/api/projects/${projectId}/code/repair`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: RepairResult };
  return body.data;
}