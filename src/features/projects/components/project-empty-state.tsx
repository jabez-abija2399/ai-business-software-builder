"use client";

import { ArrowDown, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUICK_START_STEPS = [
  "Create project",
  "Connect your data sources",
  "Install the integration SDK",
  "Make your first AI request",
];

export function ProjectEmptyState({
  onCreate,
}: {
  onCreate: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border bg-card shadow-sm">
        <Sparkles className="h-5 w-5 text-primary" aria-hidden />
      </div>

      <h2 className="mt-6 text-[20px] font-semibold tracking-tight">
        Create your first project
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted-foreground">
        Connect your application to AI through a single integration layer.
      </p>

      <div className="mt-6">
        <Button onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          Create project
        </Button>
      </div>

      <div className="mt-12 text-left">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Quick start
        </p>
        <ol className="mt-4 space-y-0">
          {QUICK_START_STEPS.map((step, index) => (
            <li key={step}>
              <div className="flex items-center gap-3 pb-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-card font-mono text-[11px] text-muted-foreground">
                  {index + 1}
                </span>
                <span className="text-[14px] text-foreground">{step}</span>
              </div>
              {index < QUICK_START_STEPS.length - 1 && (
                <ArrowDown
                  className="ml-[11px] h-3.5 w-3.5 text-muted-foreground/60"
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}