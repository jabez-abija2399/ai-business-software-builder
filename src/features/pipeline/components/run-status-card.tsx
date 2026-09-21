"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentRunStatus } from "../../blueprint/components/agent-run-status";
import { RunTechnicalDetails, type RunDetails } from "./run-technical-details";
import { PipelineSteps, type PipelineStepId } from "./steps";

/**
 * Shared in-flight / failed / completed-without-content panel for every
 * post-blueprint stage. Driven entirely by a real AgentRun: polls while the
 * run is genuinely queued/running, and on failure shows the run's real error
 * with a retry path. Never a progress bar, invented steps, or an ETA.
 */
export function RunStatusCard({
  run,
  inFlight,
  failed,
  completedWithoutContent,
  heading,
  description,
  step,
  onRetry,
  onRefresh,
}: {
  run: RunDetails;
  inFlight: boolean;
  failed: boolean;
  completedWithoutContent?: boolean;
  heading: string;
  description: string;
  step: PipelineStepId;
  onRetry: () => void;
  onRefresh: () => void;
}) {
  const body =
    failed || completedWithoutContent ? (
      <>
        <h2 className="text-base font-semibold tracking-tight">
          {failed ? "Stage failed" : "Stage completed"}
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {failed
            ? run.errorMessage ?? "The run finished with an error and produced no output."
            : "The run completed but produced no output that can be shown yet."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
            {failed ? "Retry" : "Retry"}
          </Button>
          <Button variant="outline" onClick={onRefresh}>Refresh</Button>
        </div>
      </>
    ) : (
      <>
        <AgentRunStatus status={run.status} description={heading} />
        <p className="mt-2 text-[13px] text-muted-foreground">{description}</p>
        <div className="mt-5">
          <PipelineSteps current={step} />
        </div>
        {inFlight && (
          <p className="mt-3 text-[12px] text-muted-foreground">
            This runs as a real Fleet agent. You can leave this page and return —
            the run continues and this panel reflects its state.
          </p>
        )}
      </>
    );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-card px-6 py-8">
        {body}
        <RunTechnicalDetails run={run} />
      </div>
    </div>
  );
}