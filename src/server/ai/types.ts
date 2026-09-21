/**
 * Provider-agnostic contracts for the Fleet AI layer (docs/ARCHITECTURE.md §6).
 *
 * Nothing in the app calls a model SDK directly — every generation goes through
 * `AIService`, which routes to a provider adapter. When no external provider is
 * configured the deterministic adapter is used, and its provenance is recorded
 * on the AgentRun (`provider: "deterministic"`) so generated output is never
 * mistaken for a model call.
 */

/** Persisted blueprint sections the generators read from. */
export interface BlueprintSpec {
  businessContext: Record<string, unknown> | null;
  goals: Array<Record<string, unknown>>;
  personas: Array<Record<string, unknown>>;
  roles: Array<Record<string, unknown>>;
  permissions: Array<Record<string, unknown>>;
  features: Array<Record<string, unknown>>;
  entities: Array<Record<string, unknown>>;
  workflows: Array<Record<string, unknown>>;
  businessRules: Array<Record<string, unknown>>;
  integrations: Array<Record<string, unknown>>;
  nfrs: Array<Record<string, unknown>>;
}

export interface AnalyzeBlueprintInput {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  rawDescription: string;
  constraints?: Record<string, unknown>;
}

export interface BlueprintAnalysis {
  businessContext: Record<string, unknown>;
  goals: Array<Record<string, unknown>>;
  personas: Array<Record<string, unknown>>;
  roles: Array<Record<string, unknown>>;
  permissions: Array<Record<string, unknown>>;
  features: Array<Record<string, unknown>>;
  entities: Array<Record<string, unknown>>;
  workflows: Array<Record<string, unknown>>;
  businessRules: Array<Record<string, unknown>>;
  integrations: Array<Record<string, unknown>>;
  nfrs: Array<Record<string, unknown>>;
}

export interface GenerateDesignInput {
  projectId: string;
  projectName: string;
  blueprint: BlueprintSpec;
  blueprintVersion: number;
}

export interface DesignGeneration {
  tokens: Record<string, unknown>;
  components: Array<Record<string, unknown>>;
  pages: Array<Record<string, unknown>>;
  states: Array<Record<string, unknown>>;
  responsiveRules: Array<Record<string, unknown>>;
}

/** A single generated source file, persisted as a ProjectArtifact. */
export interface GeneratedFile {
  filePath: string;
  type: string;
  content: string;
}

export interface GenerateCodeInput {
  projectId: string;
  projectName: string;
  blueprint: BlueprintSpec;
  design: DesignGeneration | null;
  taskType: string;
}

export interface CodeGeneration {
  files: GeneratedFile[];
  /** Human-readable note persisted alongside the artifacts. */
  summary: string;
}

export interface QualityCheckInput {
  projectId: string;
  projectName: string;
  taskType: string;
  blueprint: BlueprintSpec;
  design: DesignGeneration | null;
  /** Real generated files already persisted for this project. */
  files: { filePath: string; type: string; content: string }[];
}

export interface QualityCheckResult {
  testType: string;
  name: string;
  status: "PASSED" | "FAILED";
  durationMs: number;
  errorMessage: string | null;
  commandRef: string | null;
}

export interface GeneratePreviewInput {
  projectId: string;
  projectName: string;
  design: DesignGeneration | null;
  blueprint: BlueprintSpec;
}

export interface PreviewGeneration {
  html: string;
}

export interface ProviderInfo {
  name: string;
  model: string;
  external: boolean;
}

/** The adapter contract every provider implements. */
export interface AIProvider {
  info: ProviderInfo;
  analyzeBlueprint(input: AnalyzeBlueprintInput): Promise<BlueprintAnalysis>;
  generateDesign(input: GenerateDesignInput): Promise<DesignGeneration>;
  generateCode(input: GenerateCodeInput): Promise<CodeGeneration>;
  evaluateQuality(input: QualityCheckInput): Promise<QualityCheckResult[]>;
  generatePreview(input: GeneratePreviewInput): Promise<PreviewGeneration>;
}
