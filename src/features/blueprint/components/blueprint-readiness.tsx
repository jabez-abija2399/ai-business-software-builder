import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { deriveReadiness } from "../lib/sections";
import type { BlueprintSections } from "../types";

/**
 * Transparent readiness checklist (A8.2/A8.3): every item derives from actual
 * persisted data. No percentages, no fabricated "needs attention" states.
 */
export function BlueprintReadiness({ sections }: { sections: BlueprintSections }) {
  const items = deriveReadiness(sections);

  return (
    <div>
      <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        Blueprint readiness
      </h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-[13px]">
            <span
              aria-hidden
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                item.state === "defined"
                  ? "bg-success/15 text-success"
                  : "border border-muted-foreground/40 bg-transparent text-transparent"
              )}
            >
              {item.state === "defined" && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span
              className={cn(
                item.state === "defined" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {item.title}
            </span>
            <span
              className={cn(
                "ml-auto text-[11px]",
                item.state === "defined" ? "text-success" : "text-muted-foreground"
              )}
            >
              {item.state === "defined" ? "Defined" : "Not specified"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}