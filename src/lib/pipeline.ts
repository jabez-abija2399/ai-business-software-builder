/**
 * Shared pipeline vocabulary across every post-blueprint stage. These are the
 * only task-type / status strings used by the Design, Build, Quality, Preview
 * and Deploy screens (and their API routes) so each stage reports honest,
 * real AgentRun + artifact state rather than fabricated progress.
 *
 * Arrays are mutable (not `as const`) so they can be passed straight into
 * Prisma `in` filters, which expect `string[]`.
 */

export const DESIGN_TASK_TYPES: string[] = ["DESIGN_GENERATION"];

export const BUILD_TASK_TYPES: string[] = [
  "SCAFFOLD_PROJECT",
  "GENERATE_COMPONENTS",
  "GENERATE_PAGES",
  "GENERATE_API_ROUTES",
  "GENERATE_DATABASE",
  "GENERATE_TESTS",
  "GENERATE_STYLES",
  "INSTALL_DEPENDENCIES",
  "RUN_LINT",
  "RUN_TYPECHECK",
];

export const QUALITY_TASK_TYPES: string[] = [
  "TESTS",
  "SECURITY",
  "ACCESSIBILITY",
  "PERFORMANCE",
];

export const DESIGN_AGENT_TYPE = "DESIGN_AGENT" as const;
export const BUILD_AGENT_TYPE = "CODE_GENERATOR" as const;
export const QUALITY_AGENT_TYPE = "QUALITY_CHECK" as const;

export const GITHUB_PUBLISH_TASK_TYPE = "GITHUB_PUBLISH" as const;
export const GIT_AGENT_TYPE = "GIT_PUBLISHER" as const;

export const QUALITY_TEST_TYPES: string[] = QUALITY_TASK_TYPES;

export const BLUEPRINT_TASK_TYPE = "BLUEPRINT_ANALYSIS" as const;

/** Every pipeline stage that can have its own AgentRun (for Health views). */
export const PIPELINE_TASK_TYPES: string[] = [
  BLUEPRINT_TASK_TYPE,
  ...DESIGN_TASK_TYPES,
  ...BUILD_TASK_TYPES,
  ...QUALITY_TASK_TYPES,
  GITHUB_PUBLISH_TASK_TYPE,
];

/** AgentRun statuses that mean "still working" — poll while these are real. */
export const IN_FLIGHT_RUN_STATUSES: string[] = ["QUEUED", "RUNNING", "IN_PROGRESS"];
/** AgentRun statuses that mean "stopped with a problem". */
export const FAILED_RUN_STATUSES: string[] = ["FAILED", "ERROR", "CANCELLED"];

/** Deployment statuses that mean "still building" — poll while these are real. */
export const IN_FLIGHT_DEPLOYMENT_STATUSES: string[] = ["PENDING", "BUILDING", "DEPLOYING"];
/** Deployment statuses that mean the environment is reachable. */
export const READY_DEPLOYMENT_STATUSES: string[] = ["READY", "COMPLETED", "SUCCESS"];

export const DEPLOYMENT_ENVIRONMENTS: string[] = ["preview", "staging", "production"];