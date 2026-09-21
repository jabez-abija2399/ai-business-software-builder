import { PROJECT_STATUS_META } from "../lib/project-meta";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "../types";

/**
 * Semantic status with an accessible text label — never color alone.
 */
export function ProjectStatus({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const meta = PROJECT_STATUS_META[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "relative inline-flex h-2 w-2",
          status === "BUILDING" && "animate-pulse-dot"
        )}
        aria-hidden
      >
        <span className={cn("inline-flex h-full w-full rounded-full", meta.dotClass)} />
      </span>
      <span className="text-[13px] text-foreground">{meta.label}</span>
    </span>
  );
}