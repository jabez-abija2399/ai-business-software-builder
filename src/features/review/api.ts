import type { ReviewEditorData } from "./types";

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

export async function fetchReviewEditor(projectId: string): Promise<ReviewEditorData> {
  const res = await fetch(`/api/projects/${projectId}/review/editor`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: ReviewEditorData };
  return body.data;
}

export interface RunReviewResult {
  status: string;
  tasksCreated: number;
  message: string;
}

export async function runReview(projectId: string): Promise<RunReviewResult> {
  const res = await fetch(`/api/projects/${projectId}/review/run`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: RunReviewResult };
  return body.data;
}