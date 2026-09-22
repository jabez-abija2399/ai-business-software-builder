/**
 * Postgres-backed job queue (docs/ARCHITECTURE.md §7).
 *
 * Claiming uses an optimistic compare-and-swap: select the oldest QUEUED row,
 * then flip it to RUNNING only if it is still QUEUED. A losing worker simply
 * retries, so the pattern is safe with multiple workers and needs no extra
 * infrastructure. `reclaimStale*` requeues work whose worker died mid-flight.
 */

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const STALE_RUN_MS = 10 * 60 * 1000;
const STALE_DEPLOYMENT_MS = 15 * 60 * 1000;

export interface ClaimedRun {
  id: string;
  projectId: string;
  userId: string;
  taskType: string;
  agentType: string;
  inputArtifactVersion: number | null;
}

export interface ClaimedDeployment {
  id: string;
  projectId: string;
  environment: string;
  provider: string;
}

// ---------------------------------------------------------------------------
// Agent runs
// ---------------------------------------------------------------------------

export async function claimNextRun(): Promise<ClaimedRun | null> {
  const candidate = await prisma.agentRun.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!candidate) return null;

  const claimed = await prisma.agentRun.updateMany({
    where: { id: candidate.id, status: "QUEUED" },
    data: { status: "RUNNING", startedAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  return prisma.agentRun.findUnique({
    where: { id: candidate.id },
    select: {
      id: true,
      projectId: true,
      userId: true,
      taskType: true,
      agentType: true,
      inputArtifactVersion: true,
    },
  });
}

export async function reclaimStaleRuns(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_RUN_MS);
  const result = await prisma.agentRun.updateMany({
    where: { status: { in: ["RUNNING", "IN_PROGRESS"] }, startedAt: { lt: cutoff } },
    data: { status: "QUEUED", startedAt: null },
  });
  return result.count;
}

export interface CompleteRunPatch {
  outputArtifactIdsJson?: string[];
  provider?: string;
  model?: string;
  tokenUsage?: Prisma.InputJsonValue;
}

export interface CompletedRun {
  startedAt: Date | null;
  completedAt: Date;
}

export async function completeRun(
  id: string,
  patch: CompleteRunPatch = {}
): Promise<CompletedRun> {
  const completedAt = new Date();
  const updated = await prisma.agentRun.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt,
      errorCode: null,
      errorMessage: null,
      outputArtifactIdsJson: patch.outputArtifactIdsJson
        ? (patch.outputArtifactIdsJson as unknown as Prisma.InputJsonValue)
        : undefined,
      provider: patch.provider,
      model: patch.model,
      tokenUsage: patch.tokenUsage,
    },
    select: { startedAt: true },
  });
  return { startedAt: updated.startedAt, completedAt };
}

export async function failRun(
  id: string,
  errorCode: string,
  errorMessage: string
): Promise<void> {
  await prisma.agentRun.update({
    where: { id },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorCode,
      errorMessage: errorMessage.slice(0, 2000),
    },
  });
}

// ---------------------------------------------------------------------------
// Deployments
// ---------------------------------------------------------------------------

export async function claimNextDeployment(): Promise<ClaimedDeployment | null> {
  const candidate = await prisma.deployment.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!candidate) return null;

  const claimed = await prisma.deployment.updateMany({
    where: { id: candidate.id, status: "PENDING" },
    data: { status: "BUILDING" },
  });
  if (claimed.count !== 1) return null;

  return prisma.deployment.findUnique({
    where: { id: candidate.id },
    select: { id: true, projectId: true, environment: true, provider: true },
  });
}

export async function reclaimStaleDeployments(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_DEPLOYMENT_MS);
  const result = await prisma.deployment.updateMany({
    where: { status: { in: ["BUILDING", "DEPLOYING"] }, createdAt: { lt: cutoff } },
    data: { status: "PENDING" },
  });
  return result.count;
}

export interface CompleteDeploymentPatch {
  provider?: string;
  deploymentUrl?: string | null;
  metadataJson?: Prisma.InputJsonValue;
}

export async function completeDeployment(
  id: string,
  patch: CompleteDeploymentPatch = {}
): Promise<void> {
  await prisma.deployment.update({
    where: { id },
    data: {
      status: "READY",
      completedAt: new Date(),
      provider: patch.provider,
      deploymentUrl: patch.deploymentUrl ?? null,
      metadataJson: patch.metadataJson,
    },
  });
}

/**
 * Flexible settlement for real proto deployments (e.g. Vercel): can record a
 * truthful intermediate state (BUILDING) with the real provider URL and the
 * provider's deployment id in metadata, then terminal READY/FAILED with the
 * genuine reason. Only writes completedAt for terminal states.
 */
export interface SettleDeploymentPatch {
  status: string;
  provider?: string;
  deploymentUrl?: string | null;
  metadataJson?: Prisma.InputJsonValue;
  completedAt?: Date | null;
}

export async function settleDeployment(
  id: string,
  patch: SettleDeploymentPatch
): Promise<void> {
  await prisma.deployment.update({
    where: { id },
    data: {
      status: patch.status,
      provider: patch.provider,
      deploymentUrl: patch.deploymentUrl ?? null,
      metadataJson: patch.metadataJson,
      completedAt: patch.completedAt ?? null,
    },
  });
}

export async function failDeployment(
  id: string,
  errorMessage: string,
  metadataJson?: Prisma.InputJsonValue
): Promise<void> {
  await prisma.deployment.update({
    where: { id },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      deploymentUrl: null,
      metadataJson,
      // The reason is stored so the UI can show a real, actionable error.
      provider: "unconfigured",
    },
  });
  await prisma.auditLog
    .create({
      data: {
        action: "DEPLOYMENT_FAILED",
        entityType: "Deployment",
        entityId: id,
        changesJson: { errorMessage } as unknown as Prisma.InputJsonValue,
      },
    })
    .catch(() => undefined);
}
