import type {
  OverviewRange,
  ProjectActivityData,
  ProjectOverviewData,
} from "./types";

export class ApiError extends Error {
  code: string;

  constructor(message: string, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let code = `HTTP_${response.status}`;
    let message: string | null = null;
    try {
      const body = await response.json();
      if (body?.error) {
        if (body.error.code) code = body.error.code;
        if (body.error.message) message = body.error.message;
      }
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message ?? `Request failed (${response.status})`, code);
  }
  const body = await response.json();
  return body.data as T;
}

export function fetchProjectOverview(projectId: string, range: OverviewRange) {
  return fetch(`/api/projects/${projectId}/overview?range=${encodeURIComponent(range)}`)
    .then((r) => handle<ProjectOverviewData>(r));
}

export function fetchProjectActivity(projectId: string) {
  return fetch(`/api/projects/${projectId}/activity`)
    .then((r) => handle<ProjectActivityData>(r));
}