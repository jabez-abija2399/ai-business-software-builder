import { ShieldCheck } from "lucide-react";
import { PipelineSteps } from "../../pipeline/components/steps";

export function QualityEmpty({
  hasFailedRun,
  onRun,
  running,
  errorMessage,
}: {
  hasFailedRun: boolean;
  onRun: () => void;
  running: boolean;
  errorMessage: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      {hasFailedRun && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px]">
          <span className="font-medium text-destructive">Your last quality run did not complete.</span>{" "}
          <span className="text-muted-foreground">
            You can review the failing checks and run them again.
          </span>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card px-6 py-8 sm:px-10">
        <div className="flex items-start gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              Run quality checks
            </h2>
            <p className="mt-2 max-w-[36rem] text-[14px] leading-relaxed text-muted-foreground">
              Fleet runs tests, security, accessibility, and performance checks
              against the built application. Results appear here as real test
              records — no scores are estimated.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRun}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {running ? "Running checks…" : "Run quality checks"}
          </button>
        </div>

        {errorMessage && <p className="mt-3 text-[12.5px] text-destructive">{errorMessage}</p>}

        <div className="mt-8 border-t border-border pt-5">
          <PipelineSteps current="quality" />
        </div>
      </div>
    </div>
  );
}