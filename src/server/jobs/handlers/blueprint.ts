/**
 * Blueprint analysis handler — the worker half of "Start blueprint".
 * The route creates a DRAFT blueprint and a QUEUED AgentRun; this handler runs
 * the analysis and fills the real sections on that same blueprint row.
 */

import prisma from "@/lib/prisma";
import { aiService } from "@/server/ai";
import { updateBlueprint } from "@/server/db/blueprints";
import type { ClaimedRun } from "../queue";
import { HandlerError, type RunOutcome } from "./shared";

export async function handleBlueprintAnalysis(run: ClaimedRun): Promise<RunOutcome> {
  const project = await prisma.project.findUnique({
    where: { id: run.projectId },
    select: { name: true, description: true },
  });
  if (!project) throw new HandlerError("PROJECT_NOT_FOUND", "The project no longer exists.");

  const draft = await prisma.businessBlueprint.findFirst({
    where: { projectId: run.projectId, status: { not: "APPROVED" } },
    orderBy: { version: "desc" },
  });
  if (!draft) {
    throw new HandlerError(
      "NO_DRAFT_BLUEPRINT",
      "No editable blueprint draft was found for this run."
    );
  }

  const context =
    draft.businessContextJson && typeof draft.businessContextJson === "object"
      ? (draft.businessContextJson as Record<string, unknown>)
      : {};
  const rawDescription =
    typeof context.rawDescription === "string" && context.rawDescription.trim()
      ? context.rawDescription
      : project.description ?? "";

  if (!rawDescription.trim()) {
    throw new HandlerError(
      "NO_DESCRIPTION",
      "This project has no description for the analysis to work from."
    );
  }

  const { provider, value: analysis } = await aiService.analyzeBlueprint({
    projectId: run.projectId,
    projectName: project.name,
    projectDescription: project.description,
    rawDescription,
    constraints:
      context.constraints && typeof context.constraints === "object"
        ? (context.constraints as Record<string, unknown>)
        : undefined,
  });

  await updateBlueprint(draft.id, {
    businessContext: { ...context, ...analysis.businessContext, analyzedBy: provider.name },
    goals: analysis.goals,
    personas: analysis.personas,
    roles: analysis.roles,
    permissions: analysis.permissions,
    features: analysis.features,
    entities: analysis.entities,
    workflows: analysis.workflows,
    businessRules: analysis.businessRules,
    integrations: analysis.integrations,
    nfrs: analysis.nfrs,
  });

  return {
    provider,
    outputArtifactIds: [draft.id],
    message: `Analyzed ${analysis.features.length} feature(s) and ${analysis.entities.length} entity(ies).`,
  };
}
