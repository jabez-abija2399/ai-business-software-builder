/**
 * Vercel REST client for deploying generated projects (docs/ARCHITECTURE.md §7).
 *
 * Thin, typed wrappers around api.vercel.com using the real Deployments API —
 * every response value (project id, deployment id, live *.vercel.app URL,
 * readyState) comes from Vercel, never from us. Configuration is read from
 * `VERCEL_TOKEN` (required) plus optional `FLEET_VERCEL_OWNER` (a Vercel team
 * id/slug; unset uses the token's personal scope) and
 * `FLEET_VERCEL_PROJECT_PREFIX`.
 */

const API = "https://api.vercel.com";
const MAX_ATTEMPTS = 3;

export class VercelError extends Error {
  constructor(
    message: string,
    public status: number = 0,
    public code: string = "VERCEL_API_ERROR"
  ) {
    super(message);
    this.name = "VercelError";
  }
}

export interface VercelConfig {
  token: string | null;
  owner: string | null;
  projectPrefix: string;
}

export interface VercelProject {
  id: string;
  name: string;
}

export interface VercelDeployment {
  id: string;
  url: string;
  /** Immediate status: QUEUED / BUILDING / READY / ERROR / CANCELED. */
  status: string;
  /** Latest build state once provisioned. */
  readyState: string | null;
  /** Provider error detail when readyState is ERROR/CANCELED. */
  errorMessage: string | null;
}

export function vercelConfig(): VercelConfig {
  return {
    token: process.env.VERCEL_TOKEN?.trim() || null,
    owner: process.env.FLEET_VERCEL_OWNER?.trim() || null,
    projectPrefix: process.env.FLEET_VERCEL_PROJECT_PREFIX?.trim() || "fleet-app",
  };
}

/** Retries transient failures (network errors, 429, 5xx) with backoff. */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let attempts = 0;
  for (;;) {
    attempts += 1;
    try {
      const res = await fetch(url, init);
      if (res.status !== 429 && res.status < 500) return res;
      if (attempts >= MAX_ATTEMPTS) return res;
    } catch (error) {
      if (attempts >= MAX_ATTEMPTS) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
  }
}

async function request(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; body: unknown }> {
  const res = await fetchWithRetry(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

function errorMessage(body: unknown, fallback: string): string {
  // Vercel returns `{ error: { message, code } }` for many endpoints.
  const nested = (body as { error?: { message?: unknown } })?.error?.message;
  const direct = (body as { message?: unknown })?.message;
  if (typeof nested === "string" && nested) return nested;
  if (typeof direct === "string" && direct) return direct;
  return fallback;
}

export async function getVercelProject(
  token: string,
  name: string,
  teamId: string | null
): Promise<VercelProject | null> {
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const { status, body } = await request(token, "GET", `/v9/projects/${encodeURIComponent(name)}${query}`);
  if (status === 404) return null;
  if (status !== 200) {
    throw new VercelError(
      `Failed to look up Vercel project "${name}" (${status}). ${errorMessage(body, "")}`,
      status
    );
  }
  const id = (body as { id?: unknown })?.id;
  return { id: String(id ?? name), name };
}

export async function createVercelProject(
  token: string,
  name: string,
  teamId: string | null
): Promise<VercelProject> {
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const { status, body } = await request(token, "POST", `/v9/projects${query}`, {
    name,
    framework: "nextjs",
  });
  const id = (body as { id?: unknown })?.id;
  if (status !== 200 || typeof id !== "string") {
    throw new VercelError(
      `Could not create Vercel project "${name}" (${status}). ${errorMessage(body, "")}`,
      status,
      "VERCEL_PROJECT_FAILED"
    );
  }
  return { id, name };
}

/** Ensures the project exists and returns it (real create/get round-trips). */
export async function ensureVercelProject(
  token: string,
  name: string,
  teamId: string | null
): Promise<VercelProject> {
  const existing = await getVercelProject(token, name, teamId);
  if (existing) return existing;
  return createVercelProject(token, name, teamId);
}

function normalizeVerceilUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Creates a real Vercel deployment from the workspace files. Files are
 * uploaded inline via the deploy endpoint; the returned id, url and status
 * come straight from Vercel.
 */
export async function createVercelDeployment(
  token: string,
  projectName: string,
  teamId: string | null,
  files: Array<{ path: string; content: string }>,
  target: "production" | null
): Promise<VercelDeployment> {
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const { status, body } = await request(token, "POST", `/v13/deployments${query}`, {
    name: projectName,
    target: target ?? undefined,
    files: files.map((file) => ({
      file: file.path,
      data: file.content,
    })),
    projectSettings: {
      framework: "nextjs",
      installCommand: "npm install",
      buildCommand: "next build",
      outputDirectory: ".next",
    },
  });
  const id = (body as { id?: unknown })?.id;
  const url = (body as { url?: unknown })?.url;
  const statusValue = (body as { status?: unknown })?.status;
  if (status !== 200 || typeof id !== "string" || typeof url !== "string") {
    throw new VercelError(
      `Vercel rejected the deployment (${status}). ${errorMessage(body, "")}`,
      status,
      "VERCEL_DEPLOY_FAILED"
    );
  }
  const readyState = (body as { readyState?: unknown })?.readyState;
  const providerMessage = (body as { errorMessage?: unknown })?.errorMessage;
  return {
    id,
    url: normalizeVerceilUrl(url),
    status: typeof statusValue === "string" ? statusValue : "QUEUED",
    readyState: typeof readyState === "string" ? readyState : null,
    errorMessage: typeof providerMessage === "string" ? providerMessage : null,
  };
}

export async function getVercelDeployment(
  token: string,
  deploymentId: string
): Promise<VercelDeployment> {
  const { status, body } = await request(token, "GET", `/v13/deployments/${deploymentId}`);
  const id = (body as { id?: unknown })?.id;
  const url = (body as { url?: unknown })?.url;
  const readyState = (body as { readyState?: unknown })?.readyState;
  const statusValue = (body as { status?: unknown })?.status;
  if (status !== 200 || typeof id !== "string") {
    throw new VercelError(
      `Could not fetch Vercel deployment ${deploymentId} (${status}). ${errorMessage(body, "")}`,
      status
    );
  }
  const providerMessage = (body as { errorMessage?: unknown })?.errorMessage;
  return {
    id,
    url: normalizeVerceilUrl(typeof url === "string" ? url : `https://${deploymentId}.vercel.app`),
    status: typeof statusValue === "string" ? statusValue : "QUEUED",
    readyState:
      typeof readyState === "string"
        ? readyState
        : typeof statusValue === "string"
          ? statusValue
          : null,
    errorMessage: typeof providerMessage === "string" ? providerMessage : null,
  };
}