import type { PreviewEditorData } from "./types";

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

export async function fetchPreviewEditor(
  projectId: string
): Promise<PreviewEditorData> {
  const res = await fetch(`/api/projects/${projectId}/preview/editor`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: PreviewEditorData };
  return body.data;
}

export interface CreatePreviewResult {
  status: string;
  deploymentId: string;
  message: string;
}

export async function createPreview(
  projectId: string
): Promise<CreatePreviewResult> {
  const res = await fetch(`/api/projects/${projectId}/preview/create`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: CreatePreviewResult };
  return body.data;
}