/**
 * Model router (docs/ARCHITECTURE.md §6). Routes each task to a provider:
 * reasoning tasks (blueprint analysis, design) use a hosted model when one is
 * configured; tooling tasks (code generation, quality checks, preview) always
 * use the deterministic provider because they are file/analysis work, not
 * model calls.
 */

import { deterministicProvider } from "./providers/deterministic";
import { isOpenAIConfigured, openaiProvider } from "./providers/openai";
import type { AIProvider } from "./types";

export type AITask =
  | "analyzeBlueprint"
  | "generateDesign"
  | "generateCode"
  | "evaluateQuality"
  | "generatePreview";

export function isExternalConfigured(): boolean {
  return isOpenAIConfigured();
}

export function selectProvider(task: AITask): AIProvider {
  if ((task === "analyzeBlueprint" || task === "generateDesign") && isOpenAIConfigured()) {
    return openaiProvider;
  }
  return deterministicProvider;
}
