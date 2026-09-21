import type { Lifecycle } from "../types";
import type { ProjectShellData } from "./shell";

export interface PrimaryAction {
  label: string;
  href: string;
}

/** Builds a Lifecycle from the serialized shell snapshot (client-safe). */
export function serializeShellLifecycle(project: ProjectShellData): Lifecycle {
  return {
    hasBlueprint: project.blueprintVersion != null,
    blueprintVersion: project.blueprintVersion,
    blueprintStatus: project.blueprintStatus,
    hasDesign: project.hasDesign,
    hasRuns: project.hasRuns,
    hasQuality: project.hasQuality,
    hasDeployments: project.hasDeployments,
    hasActiveDeployment: project.hasActiveDeployment,
  };
}

/**
 * Derives the single most important next action from the project's lifecycle
 * (§55 in the Overview spec): one obvious path per stage, never a grid of
 * buttons.
 */
export function getPrimaryAction(projectId: string, lifecycle: Lifecycle): PrimaryAction {
  const base = (href: string) => `/projects/${projectId}${href}`;

  if (!lifecycle.hasBlueprint) {
    return { label: "Start blueprint", href: base("/blueprint") };
  }
  if (lifecycle.blueprintStatus !== "APPROVED") {
    return { label: "Review blueprint", href: base("/blueprint") };
  }
  if (!lifecycle.hasDesign) {
    return { label: "Generate design", href: base("/design") };
  }
  if (!lifecycle.hasRuns) {
    return { label: "Start build", href: base("/build") };
  }
  if (!lifecycle.hasQuality) {
    return { label: "Run quality", href: base("/quality") };
  }
  if (!lifecycle.hasDeployments) {
    return { label: "Open preview", href: base("/preview") };
  }
  if (lifecycle.hasActiveDeployment) {
    return { label: "Open preview", href: base("/preview") };
  }
  return { label: "Deploy project", href: base("/deploy") };
}