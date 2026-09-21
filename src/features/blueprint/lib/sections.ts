import type { BlueprintSections } from "../types";

export type SectionKey = keyof BlueprintSections | "rolesPermissions";

export interface SectionMeta {
  key: SectionKey;
  id: string;
  title: string;
  description: string;
}

/**
 * The single list of blueprint sections. Used by the outline, the section
 * renderer and (via readiness) the review rail so the representation never
 * diverges. "Roles & permissions" presents both real fields together.
 */
export const BLUEPRINT_SECTIONS: SectionMeta[] = [
  { key: "businessContext", id: "business-context", title: "Business context", description: "The business the product operates in and why it's being built." },
  { key: "goals", id: "goals", title: "Goals", description: "The outcomes the product is expected to achieve." },
  { key: "personas", id: "personas", title: "Personas", description: "The types of people the product serves." },
  { key: "rolesPermissions", id: "roles", title: "Roles & permissions", description: "Who can do what inside the system." },
  { key: "features", id: "features", title: "Features", description: "The capabilities required by the business." },
  { key: "entities", id: "entities", title: "Entities", description: "The data objects the system needs to store and relate." },
  { key: "workflows", id: "workflows", title: "Workflows", description: "The major processes users and the system perform." },
  { key: "businessRules", id: "business-rules", title: "Business rules", description: "Conditions and actions the system must follow." },
  { key: "integrations", id: "integrations", title: "Integrations", description: "External systems the product connects to." },
  { key: "nfrs", id: "nfrs", title: "Non-functional requirements", description: "Performance, security, reliability, and other constraints." },
  { key: "notes", id: "notes", title: "Notes", description: "Additional context recorded for the specification." },
];

export type ReadinessState = "defined" | "missing";

export interface ReadinessItem {
  key: keyof BlueprintSections;
  title: string;
  state: ReadinessState;
}

const isNonEmptyArray = (v: unknown): v is unknown[] => Array.isArray(v) && v.length > 0;
const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

/** Whether a persisted blueprint field contains meaningful data. */
export function fieldHasContent(key: keyof BlueprintSections, sections: BlueprintSections): boolean {
  const value = sections[key];
  switch (key) {
    case "businessContext":
      return value != null && typeof value === "object" && Object.keys(value as Record<string, unknown>).length > 0;
    case "notes":
      return isNonEmptyString(value);
    default:
      return isNonEmptyArray(value);
  }
}

/** Whether a grouped section presents meaningful data. */
export function sectionHasContent(key: SectionKey, sections: BlueprintSections): boolean {
  if (key === "rolesPermissions") {
    return fieldHasContent("roles", sections) || fieldHasContent("permissions", sections);
  }
  return fieldHasContent(key, sections);
}

/** Readiness items over the individual real fields — never fabricated. */
export function deriveReadiness(sections: BlueprintSections): ReadinessItem[] {
  const fields: { key: keyof BlueprintSections; title: string }[] = [
    { key: "businessContext", title: "Business context" },
    { key: "goals", title: "Goals" },
    { key: "personas", title: "Personas" },
    { key: "roles", title: "Roles" },
    { key: "permissions", title: "Permissions" },
    { key: "features", title: "Features" },
    { key: "entities", title: "Entities" },
    { key: "workflows", title: "Workflows" },
    { key: "businessRules", title: "Business rules" },
    { key: "integrations", title: "Integrations" },
    { key: "nfrs", title: "Non-functional requirements" },
    { key: "notes", title: "Notes" },
  ];
  return fields.map((f) => ({
    key: f.key,
    title: f.title,
    state: fieldHasContent(f.key, sections) ? "defined" : "missing",
  }));
}

/** Open clarification questions stored on the draft's business context. */
export function pendingClarifications(context: Record<string, unknown> | null): { id: string; question: string }[] {
  if (!context) return [];
  const raw = context.pendingQuestions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q): q is Record<string, unknown> => Boolean(q && typeof q === "object"))
    .map((q) => ({
      id: String(q.id ?? ""),
      question: typeof q.question === "string" ? q.question : "",
    }))
    .filter((q) => q.id !== "" && q.question !== "");
}

/** Previous clarification answers stored on the draft, newest first. */
export function storedClarifications(
  context: Record<string, unknown> | null
): { questionId: string; answer: string; timestamp: string }[] {
  if (!context) return [];
  const raw = context.clarifications;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === "object"))
    .map((a) => ({
      questionId: String(a.questionId ?? ""),
      answer: typeof a.answer === "string" ? a.answer : "",
      timestamp: typeof a.timestamp === "string" ? a.timestamp : "",
    }))
    .filter((a) => a.questionId !== "" && a.answer !== "");
}