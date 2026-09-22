/**
 * Real deployment health checks (monitoring).
 *
 * Checks are honest HTTP probes: the worker re-fetches READY deployment URLs on
 * an interval (and the Health screen can trigger one immediately) and records
 * the genuine outcome — status code, latency, or the real failure reason — into
 * `Deployment.healthStatus` / `healthCheckedAt` / `metadataJson.health`. A URL
 * is never reported as up without a 2xx-3xx response from it.
 */

import prisma from "@/lib/prisma";
import { READY_DEPLOYMENT_STATUSES } from "@/lib/pipeline";
import type { Prisma } from "@prisma/client";

export interface HealthCheckResult {
  status: "UP" | "DOWN" | "UNKNOWN";
  latencyMs: number | null;
  httpStatus: number | null;
  error: string | null;
  checkedAt: string;
}

export const HEALTH_CHECK_INTERVAL_MS = 120_000;
export const HEALTH_CHECK_BATCH = 3;
export const HEALTH_CHECK_TIMEOUT_MS = 30_000;

const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export function resolveAsAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${APP_URL}${url}`;
  return `https://${url}`;
}

async function probe(url: string): Promise<Omit<HealthCheckResult, "checkedAt">> {
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    const ok = res.status >= 200 && res.status < 400;
    return {
      status: ok ? "UP" : "DOWN",
      latencyMs: Date.now() - startedAt,
      httpStatus: res.status,
      error: ok ? null : `HTTP ${res.status} from ${url}`,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "TimeoutError" || error.name === "AbortError"
          ? `Request timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms (${url})`
          : `Request failed: ${error.message} (${url})`
        : String(error);
    return { status: "DOWN", latencyMs: Date.now() - startedAt, httpStatus: null, error: message };
  }
}

export interface DeployHealthRow {
  id: string;
  status: string;
  deploymentUrl: string | null;
  healthStatus: string | null;
  healthCheckedAt: Date | null;
  metadataJson: unknown;
}

/**
 * Probes a single deployment and persists the genuine result. Refuses to check
 * anything that isn't READY or has no URL (both are honest errors).
 */
export async function runHealthCheck(row: DeployHealthRow): Promise<HealthCheckResult> {
  if (!READY_DEPLOYMENT_STATUSES.includes(row.status)) {
    return {
      status: "DOWN",
      latencyMs: null,
      httpStatus: null,
      error: `Cannot health-check a ${row.status} deployment.`,
      checkedAt: new Date().toISOString(),
    };
  }
  if (!row.deploymentUrl) {
    return {
      status: "DOWN",
      latencyMs: null,
      httpStatus: null,
      error: "No deployment URL was provisioned, so nothing can be probed.",
      checkedAt: new Date().toISOString(),
    };
  }
  if (row.deploymentUrl.startsWith("/")) {
    // Preview URLs are session-gated and can't be probed externally without
    // credentials; reporting them DOWN would be a false alarm.
    return {
      status: "UNKNOWN",
      latencyMs: null,
      httpStatus: null,
      error: "Preview endpoints require a browser session and cannot be health-checked externally.",
      checkedAt: new Date().toISOString(),
    };
  }

  const { status, latencyMs, httpStatus, error } = await probe(resolveAsAbsoluteUrl(row.deploymentUrl));
  const checkedAt = new Date();

  const existing =
    row.metadataJson && typeof row.metadataJson === "object"
      ? (row.metadataJson as Record<string, unknown>)
      : {};
  await prisma.deployment.update({
    where: { id: row.id },
    data: {
      healthStatus: status,
      healthCheckedAt: checkedAt,
      metadataJson: {
        ...existing,
        health: {
          status,
          latencyMs,
          httpStatus,
          error,
          checkedAt: checkedAt.toISOString(),
        },
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return { status, latencyMs, httpStatus, error, checkedAt: checkedAt.toISOString() };
}

export async function checkDeploymentById(deploymentId: string): Promise<HealthCheckResult | null> {
  const row = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    select: {
      id: true,
      status: true,
      deploymentUrl: true,
      healthStatus: true,
      healthCheckedAt: true,
      metadataJson: true,
    },
  });
  if (!row) return null;
  return runHealthCheck(row);
}

/**
 * Re-checks the oldest READY deployments that are either unchecked or have not
 * been checked recently. Bounded batch so a slow/failed probe never starves the
 * generation queue.
 */
export async function runStaleHealthChecks(): Promise<number> {
  const now = Date.now();
  const candidates = await prisma.deployment.findMany({
    where: {
      status: { in: READY_DEPLOYMENT_STATUSES },
      AND: [
        { deploymentUrl: { not: null } },
        { NOT: { deploymentUrl: { startsWith: "/" } } },
      ],
      OR: [
        { healthCheckedAt: null },
        { healthCheckedAt: { lt: new Date(now - HEALTH_CHECK_INTERVAL_MS) } },
      ],
    },
    orderBy: { healthCheckedAt: "asc" },
    take: HEALTH_CHECK_BATCH,
    select: {
      id: true,
      status: true,
      deploymentUrl: true,
      healthStatus: true,
      healthCheckedAt: true,
      metadataJson: true,
    },
  });

  for (const candidate of candidates) {
    const result = await runHealthCheck(candidate);
    if (result.status === "DOWN") {
      // Log real failures so an operator can see them even without the UI.
      console.log(
        `[healthcheck] deployment ${candidate.id} DOWN — ${result.error ?? "no detail"}`
      );
    }
  }
  return candidates.length;
}