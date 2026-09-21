import type { DesignEditorData } from "./types";

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

export async function fetchDesignEditor(
  projectId: string
): Promise<DesignEditorData> {
  const res = await fetch(`/api/projects/${projectId}/design/editor`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: DesignEditorData };
  return body.data;
}

export interface GenerateDesignResult {
  status: string;
  runId: string;
  message: string;
}

export async function startDesignGeneration(
  projectId: string
): Promise<GenerateDesignResult> {
  const res = await fetch(`/api/projects/${projectId}/design/generate`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: GenerateDesignResult };
  return body.data;
}