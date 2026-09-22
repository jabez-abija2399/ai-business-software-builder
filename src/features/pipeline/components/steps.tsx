import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const PIPELINE_STEPS = [
  { id: "blueprint", label: "Blueprint" },
  { id: "design", label: "Design" },
  { id: "build", label: "Build" },
  { id: "quality", label: "Quality" },
  { id: "review", label: "Review" },
  { id: "preview", label: "Preview" },
  { id: "deploy", label: "Deploy" },
] as const;

export type PipelineStepId = (typeof PIPELINE_STEPS)[number]["id"];

/**
 * Linear indicator of the builder pipeline after the blueprint is approved.
 * Marks everything before `current` as complete and `current` as next. Every
 * entry is static copy, never a fake progress value.
 */
export function PipelineSteps({ current }: { current: PipelineStepId }) {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.id === current);

  return (
    <ol
      aria-label="Builder pipeline"
      className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-muted-foreground"
    >
      {PIPELINE_STEPS.map((step, i) => {
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
            {i < PIPELINE_STEPS.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}