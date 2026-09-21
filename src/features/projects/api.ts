import type {
  CreateProjectFormValues,
  ListProjectsParams,
  ProjectListResponse,
} from "./types";

interface ApiEnvelope<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code = "UNKNOWN", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

async function request<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new ApiError(
      json?.error?.message ?? `Request failed (${response.status})`,
      json?.error?.code ?? "UNKNOWN",
      json?.error?.details
    );
  }

  return json?.data as T;
}

export function buildProjectsQuery(params: ListProjectsParams): string {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.filter && params.filter !== "all") {
    searchParams.set("filter", params.filter);
  }
  if (params.sort && params.sort !== "updated") {
    searchParams.set("sort", params.sort);
  }
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.cursor) searchParams.set("cursor", params.cursor);
  return searchParams.toString();
}

export function fetchProjects(
  params: ListProjectsParams
): Promise<ProjectListResponse> {
  const query = buildProjectsQuery(params);
  return request<ProjectListResponse>(
    `/api/projects${query ? `?${query}` : ""}`,
    { method: "GET" }
  );
}

export function createProjectRequest(
  input: CreateProjectFormValues
): Promise<{ id: string; name: string }> {
  return request<{ id: string; name: string }>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteProjectRequest(projectId: string): Promise<void> {
  return request<void>(`/api/projects/${projectId}`, { method: "DELETE" });
}
