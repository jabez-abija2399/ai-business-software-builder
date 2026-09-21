import { Hammer } from "lucide-react";
import { PipelineSteps } from "../../pipeline/components/steps";

/**
 * Starting state for the Build stage once the blueprint is approved but no
 * build has been started. Real preconditions only.
 */
export function BuildEmpty({
  hasFailedRun,
  onStart,
  starting,
  errorMessage,
}: {
  hasFailedRun: boolean;
  onStart: () => void;
  starting: boolean;
  errorMessage: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      {hasFailedRun && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px]">
          <span className="font-medium text-destructive">Your last build did not complete.</span>{" "}
          <span className="text-muted-foreground">
            You can review the failing tasks and start the build again.
          </span>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card px-6 py-8 sm:px-10">
        <div className="flex items-start gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              Build your application
            </h2>
            <p className="mt-2 max-w-[36rem] text-[14px] leading-relaxed text-muted-foreground">
              Fleet agents generate the application from your approved blueprint —
              scaffolding the project, components, pages, API routes, database
              schema, tests, and styles, then running lint and typecheck.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
          >
            <Hammer className="h-4 w-4" aria-hidden />
            {starting ? "Starting build…" : "Start build"}
          </button>
        </div>

        {errorMessage && <p className="mt-3 text-[12.5px] text-destructive">{errorMessage}</p>}

        <div className="mt-8 border-t border-border pt-5">
          <PipelineSteps current="build" />
        </div>

        <p className="mt-4 text-[12px] text-muted-foreground">
          Build tasks run as real Fleet agents — nothing is simulated.
        </p>
      </div>
    </div>
  );
}