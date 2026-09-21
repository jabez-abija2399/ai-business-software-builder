import { getProjectAvatar } from "../lib/project-avatar";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
} as const;

const ICON_SIZES = {
  sm: "h-4 w-4",
  md: "h-[18px] w-[18px]",
  lg: "h-5 w-5",
} as const;

/**
 * Deterministic visual identity for a project: the same project always maps
 * to the same Lucide icon and tone, across devices and sessions.
 */
export function ProjectAvatar({
  seed,
  size = "md",
  className,
}: {
  seed: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { Icon, tone } = getProjectAvatar(seed);

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        tone.container,
        SIZES[size],
        className
      )}
    >
      <Icon className={cn(tone.icon, ICON_SIZES[size])} strokeWidth={1.75} />
    </span>
  );
}