/**
 * Generic adapter for every provider that speaks OpenAI-style Chat Completions:
 * OpenAI, OpenRouter, Groq, xAI (Grok), Google Gemini (OpenAI-compatible
 * endpoint), Mistral, DeepSeek, Together, Cerebras, and anything else whose
 * base URL accepts `Authorization: Bearer` + `{ model, messages, [response_format] }`.
 *
 * Implements the reasoning tasks (blueprint analysis, design generation).
 * Code generation and quality checks stay on the deterministic toolchain.
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

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export function createOpenAICompatibleProvider(
  definition: ProviderDefinition,
  model: string
): AIProvider {
  const provider = definition;

  async function chatJson<T>(initialMessages: ChatMessage[], schemaHint?: string): Promise<T> {
    const key = providerApiKey(provider);

    let messages = initialMessages;
    if (!provider.jsonMode) {
      messages = [...initialMessages];
      const last = messages[messages.length - 1];
      messages[messages.length - 1] = {
        role: "user",
        content: `${last.content}\n\nReturn the answer as a single JSON object.${schemaHint ? ` Expected shape: ${schemaHint}` : ""}`,
      };
    }

    const body: Record<string, unknown> = { model, messages };
    if (provider.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(provider.baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(provider.bearer ? { authorization: `Bearer ${key}` } : {}),
        ...provider.headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `${provider.name} request failed (${response.status}): ${text.slice(0, 300)}`
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${provider.name} returned an empty response.`);
    return extractJson<T>(content);
  }

  return {
    info: { name: provider.id, model, external: true },

    async analyzeBlueprint(input: AnalyzeBlueprintInput): Promise<BlueprintAnalysis> {
      const user = `Project: ${input.projectName}\nDescription:\n${input.rawDescription}\nConstraints: ${JSON.stringify(input.constraints ?? {})}`;
      const raw = await chatJson<Partial<BlueprintAnalysis>>(
        [
          { role: "system", content: ANALYZE_BLUEPRINT_SYSTEM },
          { role: "user", content: user },
        ],
        "{ businessContext, goals, personas, roles, permissions, features, entities, workflows, businessRules, integrations, nfrs }"
      );
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
      const raw = await chatJson<Partial<DesignGeneration>>(
        [
          { role: "system", content: GENERATE_DESIGN_SYSTEM },
          { role: "user", content: user },
        ],
        "{ tokens, components, pages, states, responsiveRules }"
      );
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