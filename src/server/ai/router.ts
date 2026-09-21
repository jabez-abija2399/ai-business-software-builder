/**
 * Model router (docs/ARCHITECTURE.md §6). Routes each task to a provider:
 * reasoning tasks (blueprint analysis, design) use the active hosted provider
 * when one is configured (`FLEET_AI_PROVIDER` or any registered API key);
 * tooling tasks (code generation, quality checks, preview) always use the
 * deterministic provider because they are file/analysis work, not model calls.
 *
 * See `providers/registry.ts` for the list of supported providers — OpenAI,
 * OpenRouter, Groq, xAI (Grok), Google Gemini, Anthropic, Mistral, DeepSeek,
 * Together, Cerebras. Code generation / quality stay deterministic.
 */

import { deterministicProvider } from "./providers/deterministic";
import { createAnthropicProvider } from "./providers/anthropic";
import { createOpenAICompatibleProvider } from "./providers/openai-compatible";
import { resolveActiveProvider } from "./providers/registry";
import type { AIProvider } from "./types";

export type AITask =
  | "analyzeBlueprint"
  | "generateDesign"
  | "generateCode"
  | "evaluateQuality"
  | "generatePreview";

const REASONING_TASKS = new Set<AITask>(["analyzeBlueprint", "generateDesign"]);

let cachedExternal: AIProvider | null | undefined;

function externalProvider(): AIProvider | null {
  if (cachedExternal !== undefined) return cachedExternal;

  const active = resolveActiveProvider();
  cachedExternal =
    active === null
      ? null
      : active.definition.format === "anthropic"
        ? createAnthropicProvider(active.definition, active.model)
        : createOpenAICompatibleProvider(active.definition, active.model);
  return cachedExternal;
}

export function isExternalConfigured(): boolean {
  return externalProvider() !== null;
}

export function selectProvider(task: AITask): AIProvider {
  if (REASONING_TASKS.has(task)) {
    const external = externalProvider();
    if (external) return external;
  }
  return deterministicProvider;
}