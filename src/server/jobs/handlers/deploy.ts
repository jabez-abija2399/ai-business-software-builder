/**
 * Deployment handler — the worker half of "Create preview" / "Deploy".
 *
 * Preview deployments are provisioned for real by rendering the generated
 * design to static HTML in the workspace and serving it from
 * `/api/preview/<deploymentId>`. Staging/production have no provider
 * configured, so they fail with an explicit, actionable reason rather than a
 * fabricated URL.
 */

import prisma from "@/lib/prisma";
import { aiService } from "@/server/ai";
import type { Prisma } from "@prisma/client";
import { emptySpec, loadBlueprintContext, loadDesign } from "../context";
import { writeWorkspaceFile } from "../workspace";
import { completeDeployment, failDeployment, type ClaimedDeployment } from "../queue";

export interface DeploymentOutcome {
  status: "READY" | "FAILED";
  message: string;
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

  if (deployment.environment !== "preview") {
    const message = `No deployment provider is configured for "${deployment.environment}". Set DEPLOY_PROVIDER and provider credentials to provision a real ${deployment.environment} environment.`;
    await failDeployment(deployment.id, message);
    return { status: "FAILED", message };
  }

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
