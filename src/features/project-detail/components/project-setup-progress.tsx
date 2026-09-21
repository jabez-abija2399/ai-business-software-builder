import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetupStep } from "../types";

/**
 * Compact vertical checklist shown until the project completes every stage.
 * Derived from real records — never a fake "completed" state.
 */
export function ProjectSetupProgress({
  steps,
  title = "Project setup",
}: {
  steps: SetupStep[];
  title?: string;
}) {
  const incomplete = steps.filter((s) => !s.done);
  if (incomplete.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {steps.filter((s) => s.done).length}/{steps.length} complete
        </span>
      </div>
      <ol className="mt-3 space-y-1.5">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              aria-current={step.current ? "step" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-1.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                step.current
                  ? "bg-accent/60 font-medium text-foreground"
                  : step.done
                    ? "text-muted-foreground hover:bg-accent/40"
                    : "text-muted-foreground/90 hover:bg-accent/40"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                  step.done ? "bg-success/15" : "border border-border bg-background"
                )}
              >
                {step.done ? (
                  <Check className="h-3 w-3 text-success" aria-hidden />
                ) : (
                  <Circle className="h-2.5 w-2.5 text-muted-foreground/60" aria-hidden />
                )}
              </span>
              <span className="truncate">{step.label}</span>
              {step.current && (
                <span className="ml-auto shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  Next
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}