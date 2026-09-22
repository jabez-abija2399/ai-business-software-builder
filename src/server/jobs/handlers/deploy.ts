/**
 * Deployment handler — the worker half of "Create preview" / "Deploy".
 *
 * Preview deployments are provisioned for real by rendering the generated
 * design to static HTML in the workspace and serving it from
 * `/api/preview/<deploymentId>`. Staging and production are provisioned for
 * real on Vercel (when `VERCEL_TOKEN` is set) from the actual generated files;
 * the deployment id, URL and readyState are all genuinely returned by Vercel,
 * never fabricated. Without a token they fail with an explicit, actionable
 * reason.
 */

import prisma from "@/lib/prisma";
import { aiService } from "@/server/ai";
import type { Prisma } from "@prisma/client";
import { emptySpec, loadBlueprintContext, loadDesign } from "../context";
import { writeWorkspaceFile } from "../workspace";
import {
  completeDeployment,
  failDeployment,
  settleDeployment,
  type ClaimedDeployment,
} from "../queue";
import { loadPublishableFiles } from "./publish-github";
import { HandlerError } from "./shared";
import {
  createVercelDeployment,
  ensureVercelProject,
  VercelError,
  vercelConfig,
} from "@/server/vercel/client";

export interface DeploymentOutcome {
  status: "READY" | "FAILED" | "BUILDING";
  message: string;
}

const TERMINAL_VERCEL_STATES = new Set(["READY", "ERROR", "CANCELED"]);

function slugifyRepo(input: string): string {
  const slug = String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "app";
}

type SettleInput =
  | { fatal: string; provider?: string; url?: string | null; extra?: Record<string, unknown> }
  | {
      state: "READY" | "BUILDING";
      provider: string;
      url: string;
      extra?: Record<string, unknown>;
    };

async function record(deploymentId: string, input: SettleInput): Promise<void> {
  if ("fatal" in input) {
    await settleDeployment(deploymentId, {
      status: "FAILED",
      provider: input.provider,
      deploymentUrl: input.url ?? null,
      completedAt: new Date(),
      metadataJson: {
        errorMessage: input.fatal,
        ...(input.extra ?? {}),
      } as unknown as Prisma.InputJsonValue,
    });
    return;
  }
  const isTerminal = input.state === "READY";
  await settleDeployment(deploymentId, {
    status: input.state,
    provider: input.provider,
    deploymentUrl: input.url,
    completedAt: isTerminal ? new Date() : null,
    metadataJson: input.extra
      ? ({ ...input.extra } as unknown as Prisma.InputJsonValue)
      : undefined,
  });
}

export async function handleDeployment(deployment: ClaimedDeployment): Promise<DeploymentOutcome> {
  const project = await prisma.project.findUnique({
    where: { id: deployment.projectId },
    select: { name: true },
  });
  if (!project) {
    const message = "The project no longer exists.";
    await failDeployment(deployment.id, message);
    return { status: "FAILED", message };
  }

  if (deployment.environment === "preview") {
    const design = await loadDesign(deployment.projectId);
    const blueprint = await loadBlueprintContext(deployment.projectId, { approvedOnly: true });

    const { provider, value } = await aiService.generatePreview({
      projectId: deployment.projectId,
      projectName: project.name,
      design,
      blueprint: blueprint?.spec ?? emptySpec(),
    });

    const written = await writeWorkspaceFile(
      deployment.projectId,
      `preview/${deployment.id}.html`,
      value.html
    );

    await completeDeployment(deployment.id, {
      provider: "local-static",
      deploymentUrl: `/api/preview/${deployment.id}`,
      metadataJson: {
        bytes: written.bytes,
        file: written.ref,
        generator: provider.name,
      } as unknown as Prisma.InputJsonValue,
    });

    return { status: "READY", message: `served at /api/preview/${deployment.id}` };
  }

  // Staging / production — a real Vercel deployment of the generated files.
  const config = vercelConfig();
  if (!config.token) {
    const message =
      `No deployment provider is configured for "${deployment.environment}". ` +
      `Set VERCEL_TOKEN (gitignored) in the server environment to deploy it for real.`;
    await record(deployment.id, { fatal: message });
    return { status: "FAILED", message };
  }

  try {
    // `FLEET_VERCEL_OWNER` (unset ⇒ personal scope) is a Vercel team id appended
    // as teamId; the deployment target mirrors the environment (production env
    // ⇒ Vercel production build, staging ⇒ Vercel staging build).
    const owner = config.owner;
    const projectName = `${config.projectPrefix}-${slugifyRepo(project.name)}`;
    const vercelProject = await ensureVercelProject(config.token, projectName, owner);

    const entries = await loadPublishableFiles(deployment.projectId);
    if (entries.length === 0) {
      const message = "No generated files are available to deploy. Run the build first.";
      await record(deployment.id, { fatal: message, provider: "vercel" });
      return { status: "FAILED", message };
    }
    for (const entry of entries) {
      if (entry.content === null) {
        const message =
          `${entry.path} is no longer on the worker sandbox, so it cannot be deployed. ` +
          `Re-run the build first.`;
        await record(deployment.id, { fatal: message, provider: "vercel" });
        return { status: "FAILED", message };
      }
    }

    // Vercel targets: production for the production env; staging maps to a
    // preview build (Vercel removed its "staging" target) — still a real URL.
    const target = deployment.environment === "production" ? ("production" as const) : null;
    const created = await createVercelDeployment(
      config.token,
      vercelProject.name,
      owner,
      entries.map((e) => ({ path: e.path, content: e.content as string })),
      target
    );

    const baseMetadata: Record<string, unknown> = {
      vercelDeploymentId: created.id,
      vercelStatus: created.readyState ?? created.status,
      vercelProjectId: vercelProject.id,
      target,
    };

    if (created.readyState === "READY") {
      await record(deployment.id, {
        state: "READY",
        provider: "vercel",
        url: created.url,
        extra: baseMetadata,
      });
      return { status: "READY", message: `live at ${created.url}` };
    }

    if (created.readyState === "ERROR" || created.readyState === "CANCELED") {
      await record(deployment.id, {
        fatal: created.errorMessage ?? `Vercel reported ${created.readyState} for this deployment.`,
        provider: "vercel",
        url: created.url,
        extra: baseMetadata,
      });
      return { status: "FAILED", message: `Vercel reported ${created.readyState}.` };
    }

    // Still queuing/building on Vercel — record the real URL + provider state.
    await record(deployment.id, {
      state: "BUILDING",
      provider: "vercel",
      url: created.url,
      extra: baseMetadata,
    });
    return { status: "BUILDING", message: `building on Vercel at ${created.url}` };
  } catch (error) {
    if (error instanceof VercelError) {
      await record(deployment.id, { fatal: error.message, provider: "vercel" });
      return { status: "FAILED", message: error.message };
    }
    if (error instanceof HandlerError) {
      await record(deployment.id, { fatal: error.message, provider: "vercel" });
      return { status: "FAILED", message: error.message };
    }
    throw error;
  }
}