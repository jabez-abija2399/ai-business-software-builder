/**
 * AIService — the only entry point the rest of the app uses for generation
 * (docs/ARCHITECTURE.md §6). Never call a provider SDK/HTTP endpoint directly.
 *
 * Every method returns the provider provenance alongside the value so the
 * caller can persist it on the AgentRun (`provider`, `model`).
 */

import { isExternalConfigured, selectProvider, type AITask } from "./router";
import type {
  AIProvider,
  AnalyzeBlueprintInput,
  BlueprintAnalysis,
  CodeGeneration,
  DesignGeneration,
  GenerateCodeInput,
  GenerateDesignInput,
  GeneratePreviewInput,
  PreviewGeneration,
  ProviderInfo,
  QualityCheckInput,
  QualityCheckResult,
} from "./types";

export interface ServiceResult<T> {
  provider: ProviderInfo;
  value: T;
}

async function run<T>(task: AITask, execute: (provider: AIProvider) => Promise<T>): Promise<ServiceResult<T>> {
  const provider = selectProvider(task);
  const value = await execute(provider);
  return { provider: provider.info, value };
}

export const aiService = {
  /** True when a hosted model provider is configured (e.g. OPENAI_API_KEY). */
  isExternalConfigured,

  analyzeBlueprint(input: AnalyzeBlueprintInput): Promise<ServiceResult<BlueprintAnalysis>> {
    return run("analyzeBlueprint", (p) => p.analyzeBlueprint(input));
  },
  generateDesign(input: GenerateDesignInput): Promise<ServiceResult<DesignGeneration>> {
    return run("generateDesign", (p) => p.generateDesign(input));
  },
  generateCode(input: GenerateCodeInput): Promise<ServiceResult<CodeGeneration>> {
    return run("generateCode", (p) => p.generateCode(input));
  },
  evaluateQuality(input: QualityCheckInput): Promise<ServiceResult<QualityCheckResult[]>> {
    return run("evaluateQuality", (p) => p.evaluateQuality(input));
  },
  generatePreview(input: GeneratePreviewInput): Promise<ServiceResult<PreviewGeneration>> {
    return run("generatePreview", (p) => p.generatePreview(input));
  },
};

export type { BlueprintAnalysis, DesignGeneration, CodeGeneration, QualityCheckResult, PreviewGeneration };
