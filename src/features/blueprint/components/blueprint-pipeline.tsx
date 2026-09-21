import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const BLUEPRINT_STEPS = [
  { id: "idea", label: "Your idea" },
  { id: "describe", label: "Describe it" },
  { id: "analyze", label: "Analyze" },
  { id: "review", label: "Review blueprint" },
  { id: "approve", label: "Approve" },
  { id: "design", label: "Continue to Design" },
] as const;

export type BlueprintStepId = (typeof BLUEPRINT_STEPS)[number]["id"];

/**
 * Small linear indicator of the blueprint lifecycle (§1): from a raw idea to
 * the handoff to Design. `current` marks the next actionable step — every
 * entry is static copy, never a fake progress value.
 */
export function BlueprintPipeline({ current }: { current: BlueprintStepId }) {
  const currentIndex = BLUEPRINT_STEPS.findIndex((s) => s.id === current);

  return (
    <ol
      aria-label="Blueprint flow"
      className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-muted-foreground"
    >
      {BLUEPRINT_STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-x-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
                done && "bg-success/10 font-medium text-success",
                active && "bg-primary/10 font-semibold text-primary",
                !done && !active && "text-muted-foreground/80"
              )}
            >
              {done ? (
                <Check className="h-3 w-3" aria-hidden />
              ) : (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    active ? "bg-primary" : "bg-muted-foreground/50"
                  )}
                  aria-hidden
                />
              )}
              {step.label}
            </span>
            {i < BLUEPRINT_STEPS.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}