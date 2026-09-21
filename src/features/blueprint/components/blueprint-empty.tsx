import Link from "next/link";
import { FileText, Sparkles } from "lucide-react";
import { BlueprintPipeline } from "./blueprint-pipeline";
import type { BlueprintEditorProject } from "../types";

export interface EmptyStateProps {
  project: BlueprintEditorProject;
  /** Reveals the description-input state on the same page. */
  onStart: () => void;
  /** Reveals the description-input state prefilled with a sample description. */
  onExample: () => void;
  previouslyFailed: boolean;
}

/**
 * §1 — Brand-new projects with no blueprint yet. Explains what creating a
 * blueprint does without any decorative illustration or invented statistics.
 */
export function BlueprintEmpty({
  project,
  onStart,
  onExample,
  previouslyFailed,
}: EmptyStateProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      {previouslyFailed && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px]">
          <span className="font-medium text-destructive">Your last analysis failed.</span>{" "}
          <span className="text-muted-foreground">
            You can review your description below and try again.
          </span>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card px-6 py-8 sm:px-10">
        <div className="flex items-start gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent sm:flex">
            <FileText className="h-6 w-6 text-foreground/80" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              Turn your idea into a buildable blueprint
            </h2>
            <p className="mt-2 max-w-[36rem] text-[14px] leading-relaxed text-muted-foreground">
              Fleet will analyze your product idea and organize it into business
              context, users, roles, features, data, workflows, business rules,
              integrations, and non-functional requirements.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Analyze my idea
          </button>
          <button
            type="button"
            onClick={onExample}
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            See an example
          </button>
        </div>

        <div className="mt-8 border-t border-border pt-5">
          <BlueprintPipeline current={previouslyFailed ? "describe" : "describe"} />
        </div>

        <p className="mt-5 text-[12px] text-muted-foreground">
          Creating the blueprint for{" "}
          <Link
            href={`/projects/${project.id}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {project.name}
          </Link>
          . Analysis runs as a real Fleet agent — nothing is simulated.
        </p>
      </div>
    </div>
  );
}