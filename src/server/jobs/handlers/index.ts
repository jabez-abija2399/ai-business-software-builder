/**
 * Run dispatcher — maps an AgentRun's taskType to a handler. Task types come
 * from `src/lib/pipeline.ts` so the worker and the API routes cannot drift.
 */

import { BUILD_TASK_TYPES, DESIGN_TASK_TYPES, QUALITY_TASK_TYPES } from "@/lib/pipeline";
import type { ClaimedRun } from "../queue";
import { handleBlueprintAnalysis } from "./blueprint";
import { handleDesignGeneration } from "./design";
import { handleBuildTask } from "./build";
import { handleQualityCheck } from "./quality";
import { handlePublishGitHub } from "./publish-github";
import { HandlerError, type RunOutcome } from "./shared";

export async function executeRun(run: ClaimedRun): Promise<RunOutcome> {
  if (run.taskType === "BLUEPRINT_ANALYSIS") return handleBlueprintAnalysis(run);
  if (run.taskType === "GITHUB_PUBLISH") return handlePublishGitHub(run);
  if (DESIGN_TASK_TYPES.includes(run.taskType)) return handleDesignGeneration(run);
  if (BUILD_TASK_TYPES.includes(run.taskType)) return handleBuildTask(run);
  if (QUALITY_TASK_TYPES.includes(run.taskType)) return handleQualityCheck(run);

  throw new HandlerError(
    "UNSUPPORTED_TASK",
    `No worker handler is registered for task type "${run.taskType}".`
  );
}

export { HandlerError } from "./shared";
export { handleDeployment } from "./deploy";
export type { RunOutcome } from "./shared";
