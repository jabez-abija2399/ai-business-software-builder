/**
 * Anthropic adapter — talks to the Claude Messages API
 * (`POST https://api.anthropic.com/v1/messages`) with the `x-api-key` and
 * `anthropic-version` headers. Claude has no `response_format`, so JSON shape is
 * pinned in the prompt and extracted robustly from the reply.
 */

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
  QualityCheckInput,
  QualityCheckResult,
} from "../types";
import { extractJson } from "./json";
import { ANALYZE_BLUEPRINT_SYSTEM, GENERATE_DESIGN_SYSTEM } from "./prompts";
import { ProviderTaskUnsupportedError } from "./errors";
import { providerApiKey, type ProviderDefinition } from "./registry";

const MAX_TOKENS = 4096;

export function createAnthropicProvider(
  definition: ProviderDefinition,
  model: string
): AIProvider {
  const provider = definition;

  async function chatJson<T>(system: string, user: string): Promise<T> {
    const key = providerApiKey(provider);

    const response = await fetch(provider.baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        ...provider.headers,
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`${provider.name} request failed (${response.status}): ${text.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      content?: { type?: string; text?: string }[];
    };
    const text = payload.content?.find((block) => block.type === "text")?.text;
    if (!text) throw new Error(`${provider.name} returned an empty response.`);
    return extractJson<T>(text);
  }

  return {
    info: { name: provider.id, model, external: true },

    async analyzeBlueprint(input: AnalyzeBlueprintInput): Promise<BlueprintAnalysis> {
      const user = `Project: ${input.projectName}\nDescription:\n${input.rawDescription}\nConstraints: ${JSON.stringify(input.constraints ?? {})}`;
      const raw = await chatJson<Partial<BlueprintAnalysis>>(ANALYZE_BLUEPRINT_SYSTEM, user);
      return {
        businessContext: raw.businessContext ?? { rawDescription: input.rawDescription },
        goals: raw.goals ?? [],
        personas: raw.personas ?? [],
        roles: raw.roles ?? [],
        permissions: raw.permissions ?? [],
        features: raw.features ?? [],
        entities: raw.entities ?? [],
        workflows: raw.workflows ?? [],
        businessRules: raw.businessRules ?? [],
        integrations: raw.integrations ?? [],
        nfrs: raw.nfrs ?? [],
      };
    },

    async generateDesign(input: GenerateDesignInput): Promise<DesignGeneration> {
      const user = JSON.stringify({ project: input.projectName, blueprint: input.blueprint });
      const raw = await chatJson<Partial<DesignGeneration>>(GENERATE_DESIGN_SYSTEM, user);
      return {
        tokens: raw.tokens ?? {},
        components: raw.components ?? [],
        pages: raw.pages ?? [],
        states: raw.states ?? [],
        responsiveRules: raw.responsiveRules ?? [],
      };
    },

    async generateCode(_input: GenerateCodeInput): Promise<CodeGeneration> {
      throw new ProviderTaskUnsupportedError(provider.name, "generateCode");
    },
    async evaluateQuality(_input: QualityCheckInput): Promise<QualityCheckResult[]> {
      throw new ProviderTaskUnsupportedError(provider.name, "evaluateQuality");
    },
    async generatePreview(_input: GeneratePreviewInput): Promise<PreviewGeneration> {
      throw new ProviderTaskUnsupportedError(provider.name, "generatePreview");
    },
  };
}