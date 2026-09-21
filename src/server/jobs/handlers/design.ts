/**
 * Design generation handler — the worker half of "Generate design".
 * Requires an APPROVED blueprint (the route gates this too; the worker
 * re-checks because queued work can outlive the state it was created in).
 */

import prisma from "@/lib/prisma";
import { aiService } from "@/server/ai";
import type { Prisma } from "@prisma/client";
import { loadBlueprintContext } from "../context";
import type { ClaimedRun } from "../queue";
import { HandlerError, type RunOutcome } from "./shared";

export async function handleDesignGeneration(run: ClaimedRun): Promise<RunOutcome> {
  const project = await prisma.project.findUnique({
    where: { id: run.projectId },
    select: { name: true },
  });
  if (!project) throw new HandlerError("PROJECT_NOT_FOUND", "The project no longer exists.");

  const blueprint = await loadBlueprintContext(run.projectId, { approvedOnly: true });
  if (!blueprint) {
    throw new HandlerError(
      "NO_APPROVED_BLUEPRINT",
      "Design generation requires an approved blueprint."
    );
  }

  const { provider, value: design } = await aiService.generateDesign({
    projectId: run.projectId,
    projectName: project.name,
    blueprint: blueprint.spec,
    blueprintVersion: blueprint.version,
  });

  const latest = await prisma.designArtifact.findFirst({
    where: { projectId: run.projectId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const artifact = await prisma.designArtifact.create({
    data: {
      projectId: run.projectId,
      version: (latest?.version ?? 0) + 1,
      status: "DRAFT",
      tokensJson: design.tokens as unknown as Prisma.InputJsonValue,
      componentsJson: design.components as unknown as Prisma.InputJsonValue,
      pagesJson: design.pages as unknown as Prisma.InputJsonValue,
      statesJson: design.states as unknown as Prisma.InputJsonValue,
      responsiveRulesJson: design.responsiveRules as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    provider,
    outputArtifactIds: [artifact.id],
    message: `Generated ${design.pages.length} page(s) and ${design.components.length} component(s).`,
  };
}
