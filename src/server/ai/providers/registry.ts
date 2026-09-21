/**
 * Provider registry — every hosted model provider Fleet can route to.
 *
 * Adding a provider is one entry here: id, key env var, chat-completions base
 * URL, request format and a default model (overridable per provider with
 * `<ID>_MODEL`, e.g. `OPENAI_MODEL`, `OPENROUTER_MODEL`).
 *
 * The active provider is chosen with `FLEET_AI_PROVIDER` (e.g.
 * `FLEET_AI_PROVIDER=openrouter`); without it, the first provider whose API key
 * is present wins, in the order listed below. If no key is present the
 * deterministic adapter is used.
 */

export type ProviderFormat = "openai" | "anthropic";

export interface ProviderDefinition {
  id: string;
  name: string;
  keyEnv: string;
  baseUrl: string;
  format: ProviderFormat;
  /** Provider sends/receives `Authorization: Bearer <key>`. */
  bearer: boolean;
  /** Sends `response_format: { type: "json_object" }`. */
  jsonMode: boolean;
  defaultModel: string;
  modelEnv: string;
  /** Extra static headers (e.g. Anthropic versioning). */
  headers?: Record<string, string>;
  notes: string;
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: "openai",
    name: "OpenAI",
    keyEnv: "OPENAI_API_KEY",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    format: "openai",
    bearer: true,
    jsonMode: true,
    defaultModel: "gpt-4o-mini",
    modelEnv: "OPENAI_MODEL",
    notes: "OpenAI Chat Completions (gpt-4o, gpt-4o-mini, o-series).",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    keyEnv: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    format: "openai",
    bearer: true,
    jsonMode: true,
    defaultModel: "openai/gpt-4o-mini",
    modelEnv: "OPENROUTER_MODEL",
    notes: "One key for hundreds of models (openai/*, anthropic/*, google/*, meta/*, …).",
  },
  {
    id: "groq",
    name: "Groq",
    keyEnv: "GROQ_API_KEY",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    format: "openai",
    bearer: true,
    jsonMode: true,
    defaultModel: "llama-3.3-70b-versatile",
    modelEnv: "GROQ_MODEL",
    notes: "Fast inference on Llama / Mixtral / DeepSeek family models.",
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    keyEnv: "XAI_API_KEY",
    baseUrl: "https://api.x.ai/v1/chat/completions",
    format: "openai",
    bearer: true,
    jsonMode: true,
    defaultModel: "grok-3-mini",
    modelEnv: "XAI_MODEL",
    notes: "Grok models (grok-2, grok-3 family).",
  },
  {
    id: "google",
    name: "Google Gemini",
    keyEnv: "GEMINI_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    format: "openai",
    bearer: true,
    jsonMode: true,
    defaultModel: "gemini-2.0-flash",
    modelEnv: "GEMINI_MODEL",
    notes: "Gemini via the OpenAI-compatible endpoint (key works with GOOGLE_API_KEY too).",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    keyEnv: "ANTHROPIC_API_KEY",
    baseUrl: "https://api.anthropic.com/v1/messages",
    format: "anthropic",
    bearer: false,
    jsonMode: false,
    defaultModel: "claude-sonnet-4-5",
    modelEnv: "ANTHROPIC_MODEL",
    headers: { "anthropic-version": "2023-06-01" },
    notes: "Claude via the Messages API (x-api-key + anthropic-version headers).",
  },
  {
    id: "mistral",
    name: "Mistral",
    keyEnv: "MISTRAL_API_KEY",
    baseUrl: "https://api.mistral.ai/v1/chat/completions",
    format: "openai",
    bearer: true,
    jsonMode: true,
    defaultModel: "mistral-small-latest",
    modelEnv: "MISTRAL_MODEL",
    notes: "Mistral Small / Medium / Large.",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    keyEnv: "DEEPSEEK_API_KEY",
    baseUrl: "https://api.deepseek.com/v1/chat/completions",
    format: "openai",
    bearer: true,
    jsonMode: true,
    defaultModel: "deepseek-chat",
    modelEnv: "DEEPSEEK_MODEL",
    notes: "deepseek-chat / deepseek-reasoner.",
  },
  {
    id: "together",
    name: "Together AI",
    keyEnv: "TOGETHER_API_KEY",
    baseUrl: "https://api.together.xyz/v1/chat/completions",
    format: "openai",
    bearer: true,
    jsonMode: false,
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    modelEnv: "TOGETHER_MODEL",
    notes: "Hosted open-weights models (Llama, Qwen, DeepSeek).",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    keyEnv: "CEREBRAS_API_KEY",
    baseUrl: "https://api.cerebras.ai/v1/chat/completions",
    format: "openai",
    bearer: true,
    jsonMode: false,
    defaultModel: "llama-3.3-70b",
    modelEnv: "CEREBRAS_MODEL",
    notes: "Very high throughput inference on open models.",
  },
];

function keyFor(def: ProviderDefinition): string | undefined {
  const direct = process.env[def.keyEnv]?.trim();
  if (direct) return direct;
  // Google allows either GEMINI_API_KEY or GOOGLE_API_KEY via the same endpoint.
  if (def.id === "google") return process.env.GOOGLE_API_KEY?.trim() || undefined;
  return undefined;
}

export function isProviderConfigured(def: ProviderDefinition): boolean {
  return Boolean(keyFor(def));
}

export function providerApiKey(def: ProviderDefinition): string {
  const key = keyFor(def);
  if (!key) {
    throw new Error(
      `${def.name} is not configured (missing ${def.keyEnv}). Set the key to use this provider.`
    );
  }
  return key;
}

export function modelFor(def: ProviderDefinition): string {
  return process.env[def.modelEnv]?.trim() || def.defaultModel;
}

export interface ActiveProvider {
  definition: ProviderDefinition;
  model: string;
}

/**
 * The active external provider: `FLEET_AI_PROVIDER` wins if it names a known
 * provider; otherwise the first configured provider in registry order.
 * Returns null when nothing is configured (deterministic adapter is used).
 */
export function resolveActiveProvider(): ActiveProvider | null {
  const explicit = process.env.FLEET_AI_PROVIDER?.trim().toLowerCase();
  if (explicit) {
    const def = PROVIDERS.find((p) => p.id === explicit);
    if (def) return { definition: def, model: modelFor(def) };
  }

  for (const def of PROVIDERS) {
    if (isProviderConfigured(def)) return { definition: def, model: modelFor(def) };
  }

  return null;
}

export { keyFor as providerKeyFor };