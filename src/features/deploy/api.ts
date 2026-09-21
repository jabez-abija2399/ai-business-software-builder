import type { DeployEditorData, DeploymentEnvironment } from "./types";

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

export async function fetchDeployEditor(
  projectId: string
): Promise<DeployEditorData> {
  const res = await fetch(`/api/projects/${projectId}/deploy/editor`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: DeployEditorData };
  return body.data;
}

export interface CreateDeploymentResult {
  status: string;
  deploymentId: string;
  environment: string;
  message: string;
}

export async function createDeployment(
  projectId: string,
  environment: DeploymentEnvironment
): Promise<CreateDeploymentResult> {
  const res = await fetch(`/api/projects/${projectId}/deploy/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ environment }),
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as { data: CreateDeploymentResult };
  return body.data;
}