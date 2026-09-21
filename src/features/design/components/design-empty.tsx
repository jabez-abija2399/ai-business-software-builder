import { Sparkles } from "lucide-react";
import { PipelineSteps } from "../../pipeline/components/steps";

/**
 * Honest starting point for the Design stage once the blueprint is approved
 * but no design has been generated yet. Only real prerequisites are listed.
 */
export function DesignEmpty({
  hasFailedRun,
  onGenerate,
  generating,
  errorMessage,
}: {
  hasFailedRun: boolean;
  onGenerate: () => void;
  generating: boolean;
  errorMessage: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      {hasFailedRun && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px]">
          <span className="font-medium text-destructive">Your last design run failed.</span>{" "}
          <span className="text-muted-foreground">
            You can review the error below and start generation again.
          </span>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card px-6 py-8 sm:px-10">
        <div className="flex items-start gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              Generate the design for your product
            </h2>
            <p className="mt-2 max-w-[36rem] text-[14px] leading-relaxed text-muted-foreground">
              Fleet will turn your approved blueprint into design tokens,
              components, pages, user flows, and responsive rules that the build
              stage can generate code from.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {generating ? "Generating…" : "Generate design"}
          </button>
        </div>

        {errorMessage && <p className="mt-3 text-[12.5px] text-destructive">{errorMessage}</p>}

        <div className="mt-8 border-t border-border pt-5">
          <PipelineSteps current="design" />
        </div>

        <p className="mt-4 text-[12px] text-muted-foreground">
          Design generation runs as a real Fleet agent — nothing is simulated.
          When the run completes, the design artifact is written and appears here.
        </p>
      </div>
    </div>
  );
}