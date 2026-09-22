/**
 * Worker loop (docs/ARCHITECTURE.md §7). Runs in its own process, separate from
 * Next.js, so long generation work never blocks a request. It drains the
 * Postgres-backed queue, dispatches each AgentRun to a handler and records the
 * real terminal status.
 */

import { aiService } from "@/server/ai";
import { executeRun, HandlerError } from "./handlers";
import {
  claimNextDeployment,
  claimNextRun,
  completeRun,
  failDeployment,
  failRun,
  reclaimStaleDeployments,
  reclaimStaleRuns,
  type ClaimedDeployment,
  type ClaimedRun,
} from "./queue";
import { handleDeployment } from "./handlers/deploy";
import { runStaleHealthChecks } from "@/server/monitoring/healthchecks";
import { trackAnalytics } from "@/server/analytics/service";

export interface WorkerOptions {
  /** Drain the queue and exit instead of polling forever. */
  once?: boolean;
  pollIntervalMs?: number;
}

const RECLAIM_INTERVAL_MS = 60_000;
const HEALTH_LOOP_INTERVAL_MS = 30_000;

function log(message: string): void {
  console.log(`[worker ${new Date().toISOString()}] ${message}`);
}

function describe(error: unknown): { code: string; message: string } {
  if (error instanceof HandlerError) return { code: error.code, message: error.message };
  if (error instanceof Error) return { code: "HANDLER_ERROR", message: error.message };
  return { code: "UNKNOWN_ERROR", message: String(error) };
}

function trackRunFinished(
  run: ClaimedRun,
  outcome: { status: "COMPLETED" | "FAILED"; provider?: string | null; model?: string | null; durationMs: number | null; error?: { code: string; message: string } | null }
): void {
  try {
    trackAnalytics("run_finished", {
      distinctId: run.userId,
      properties: {
        projectId: run.projectId,
        runId: run.id,
        taskType: run.taskType,
        agentType: run.agentType,
        status: outcome.status,
        provider: outcome.provider ?? null,
        model: outcome.model ?? null,
        durationMs: outcome.durationMs,
        errorCode: outcome.error?.code ?? null,
      },
    });
  } catch {
    // Analytics must never affect worker progress.
  }
}

async function processRun(run: ClaimedRun): Promise<void> {
  try {
    const outcome = await executeRun(run);
    const { startedAt, completedAt } = await completeRun(run.id, {
      outputArtifactIdsJson: outcome.outputArtifactIds,
      provider: outcome.provider?.name,
      model: outcome.provider?.model,
      tokenUsage: outcome.tokenUsage,
    });
    log(`run ${run.id} [${run.taskType}] COMPLETED — ${outcome.message ?? "done"}`);
    trackRunFinished(run, {
      status: "COMPLETED",
      provider: outcome.provider?.name,
      model: outcome.provider?.model,
      durationMs:
        startedAt != null ? Math.max(0, completedAt.getTime() - startedAt.getTime()) : null,
    });
  } catch (error) {
    const { code, message } = describe(error);
    await failRun(run.id, code, message);
    log(`run ${run.id} [${run.taskType}] FAILED (${code}) — ${message}`);
    trackRunFinished(run, {
      status: "FAILED",
      durationMs: null,
      error: { code, message },
    });
  }
}

async function processDeployment(deployment: ClaimedDeployment): Promise<void> {
  try {
    const outcome = await handleDeployment(deployment);
    log(
      `deployment ${deployment.id} [${deployment.environment}] ${outcome.status} — ${outcome.message}`
    );
  } catch (error) {
    const { code, message } = describe(error);
    await failDeployment(deployment.id, `${code}: ${message}`);
    log(`deployment ${deployment.id} [${deployment.environment}] FAILED (${code}) — ${message}`);
  }
}

/** Claims and processes at most one unit of work. Returns false when idle. */
export async function processOne(): Promise<boolean> {
  const run = await claimNextRun();
  if (run) {
    await processRun(run);
    return true;
  }

  const deployment = await claimNextDeployment();
  if (deployment) {
    await processDeployment(deployment);
    return true;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Background loop that re-probes READY deployments. Runs alongside the queue
 * drain so a slow/failed HTTP probe never delays generation work. The queue
 * drain (`processOne`) is unaffected.
 */
async function healthCheckLoop(running: () => boolean): Promise<void> {
  while (running()) {
    try {
      await runStaleHealthChecks();
    } catch (error) {
      const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
      log(`health check issue: ${message}`);
    }
    await sleep(HEALTH_LOOP_INTERVAL_MS);
  }
}

export async function runWorker(options: WorkerOptions = {}): Promise<void> {
  const once = options.once ?? false;
  const pollIntervalMs = options.pollIntervalMs ?? 2000;

  log(
    `started (mode=${once ? "once" : "watch"}, provider=${
      aiService.isExternalConfigured() ? "external" : "deterministic"
    })`
  );

  let running = true;
  const stop = () => {
    running = false;
    log("shutdown requested — finishing current task");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  // Health checks only make sense for a long-lived worker; --once just drains
  // the queue (the Health screen can trigger checks on demand).
  const healthLoopPromise = once ? Promise.resolve() : healthCheckLoop(() => running);

  let lastReclaim = 0;
  let consecutiveErrors = 0;

  while (running) {
    try {
      if (Date.now() - lastReclaim >= RECLAIM_INTERVAL_MS) {
        const runs = await reclaimStaleRuns();
        const deployments = await reclaimStaleDeployments();
        if (runs || deployments) {
          log(`reclaimed ${runs} stale run(s), ${deployments} stale deployment(s)`);
        }
        lastReclaim = Date.now();
      }

      const processed = await processOne();
      consecutiveErrors = 0;
      if (!processed) {
        if (once) break;
        await sleep(pollIntervalMs);
      }
    } catch (error) {
      // Transient database outages (e.g. a connection-pool blip) must not kill
      // the worker — log, back off and retry. `once` mode gives up after a few
      // attempts so a persistent failure still surfaces.
      consecutiveErrors += 1;
      const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
      log(`transient error (attempt ${consecutiveErrors}): ${message}`);
      if (once && consecutiveErrors >= 5) throw error;
      await sleep(Math.min(pollIntervalMs * consecutiveErrors, 10_000));
    }
  }

  if (!once) await healthLoopPromise;
  log("stopped");
}
