/**
 * OpenAI adapter — activated only when `OPENAI_API_KEY` is set (see router.ts).
 * It implements the reasoning-heavy tasks (blueprint analysis, design
 * generation). Code generation and quality checks stay on the deterministic
 * toolchain, which is not a model task.
 *
 * The adapter never runs without a key, and any HTTP/parse failure surfaces as
 * a real error so the AgentRun is marked FAILED with a truthful message.
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

export class ProviderNotConfiguredError extends Error {
  constructor(task: string) {
    super(`OpenAI provider is not configured (missing OPENAI_API_KEY) for ${task}.`);
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderTaskUnsupportedError extends Error {
  constructor(task: string) {
    super(`OpenAI provider does not implement ${task}; it is handled deterministically.`);
    this.name = "ProviderTaskUnsupportedError";
  }
}

function apiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(apiKey());
}

const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

async function chatJson<T>(system: string, user: string): Promise<T> {
  const key = apiKey();
  if (!key) throw new ProviderNotConfiguredError("chatJson");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response.");
  return JSON.parse(content) as T;
}

export const openaiProvider: AIProvider = {
  info: { name: "openai", model: MODEL, external: true },

  async analyzeBlueprint(input: AnalyzeBlueprintInput): Promise<BlueprintAnalysis> {
    const system =
      "You are a business analyst. Return a JSON object with keys: businessContext, goals, personas, roles, permissions, features, entities, workflows, businessRules, integrations, nfrs. " +
      "goals items: {goal, priority, description}. personas: {name, role, description, goals[]}. roles: {name, description, permissions[]}. permissions: {resource, actions[], roles[]}. " +
      "features: {name, description, priority, requirements[]}. entities: {name, description, attributes:[{name,type,required,unique}], relationships:[{type,target,description}]}. " +
      "workflows: {name, trigger, description, steps:[{name,description,actor}]}. businessRules: {name, condition, action, description}. integrations: {name, type, direction, description}. nfrs: {requirement, category, metric, target}. " +
      "Base every field only on the supplied description; use empty arrays where the description gives no basis.";
    const user = `Project: ${input.projectName}\nDescription:\n${input.rawDescription}\nConstraints: ${JSON.stringify(input.constraints ?? {})}`;
    const raw = await chatJson<Partial<BlueprintAnalysis>>(system, user);
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
    const system =
      "You are a product designer. Return a JSON object with keys: tokens (object), components (array of {name, kind, description}), pages (array of {title, path, description}), states (array of {name, description}), responsiveRules (array of {name, rule}). " +
      "Derive everything from the supplied blueprint; do not invent unrelated features.";
    const user = JSON.stringify({ project: input.projectName, blueprint: input.blueprint });
    const raw = await chatJson<Partial<DesignGeneration>>(system, user);
    return {
      tokens: raw.tokens ?? {},
      components: raw.components ?? [],
      pages: raw.pages ?? [],
      states: raw.states ?? [],
      responsiveRules: raw.responsiveRules ?? [],
    };
  },

  async generateCode(_input: GenerateCodeInput): Promise<CodeGeneration> {
    throw new ProviderTaskUnsupportedError("generateCode");
  },
  async evaluateQuality(_input: QualityCheckInput): Promise<QualityCheckResult[]> {
    throw new ProviderTaskUnsupportedError("evaluateQuality");
  },
  async generatePreview(_input: GeneratePreviewInput): Promise<PreviewGeneration> {
    throw new ProviderTaskUnsupportedError("generatePreview");
  },
};
