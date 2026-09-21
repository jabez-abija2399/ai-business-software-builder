import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Bot,
  Boxes,
  Cloud,
  Cpu,
  Database,
  Globe,
  Layers,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";

const ICONS: LucideIcon[] = [
  Boxes,
  Cpu,
  Database,
  Globe,
  Layers,
  Cloud,
  Bot,
  Zap,
  Terminal,
  Blocks,
  Sparkles,
  Workflow,
];

interface AvatarTone {
  container: string;
  icon: string;
}

/**
 * Static class strings (not computed) so Tailwind's compiler can see them.
 * Muted, developer-console friendly palettes that work in light and dark.
 */
const TONES: AvatarTone[] = [
  {
    container: "bg-blue-500/10 dark:bg-blue-400/10",
    icon: "text-blue-600 dark:text-blue-400",
  },
  {
    container: "bg-violet-500/10 dark:bg-violet-400/10",
    icon: "text-violet-600 dark:text-violet-400",
  },
  {
    container: "bg-emerald-500/10 dark:bg-emerald-400/10",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  {
    container: "bg-amber-500/10 dark:bg-amber-400/10",
    icon: "text-amber-600 dark:text-amber-400",
  },
  {
    container: "bg-rose-500/10 dark:bg-rose-400/10",
    icon: "text-rose-600 dark:text-rose-400",
  },
  {
    container: "bg-cyan-500/10 dark:bg-cyan-400/10",
    icon: "text-cyan-600 dark:text-cyan-400",
  },
  {
    container: "bg-indigo-500/10 dark:bg-indigo-400/10",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  {
    container: "bg-teal-500/10 dark:bg-teal-400/10",
    icon: "text-teal-600 dark:text-teal-400",
  },
];

/** FNV-1a — stable, dependency-free string hash. */
function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export interface ProjectAvatarIdentity {
  Icon: LucideIcon;
  tone: AvatarTone;
}

/**
 * Deterministically maps a project id/name to a Lucide icon + tone so every
 * project has a stable visual identity across sessions and devices.
 */
export function getProjectAvatar(seed: string): ProjectAvatarIdentity {
  const hash = hashSeed(seed || "project");
  const Icon = ICONS[hash % ICONS.length];
  const tone = TONES[Math.floor(hash / ICONS.length) % TONES.length];
  return { Icon, tone };
}
