"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentRunStatus } from "./agent-run-status";
import { BlueprintPipeline } from "./blueprint-pipeline";
import { FAILED_ANALYSIS, IN_FLIGHT_ANALYSIS, type BlueprintEditorData } from "../types";
import { formatUpdatedAgo } from "../../project-detail/lib/format";

/**
 * Persistent analysis workspace (A3/B9): real AgentRun status, no fake
 * progress, no invented activity steps or ETA. Failed runs keep the failure
 * visible inside the page with a real retry path.
 */
export function BlueprintAnalysisPanel({
  data,
  onRetry,
  onRefresh,
}: {
  data: BlueprintEditorData;
  onRetry: () => void;
  onRefresh: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const run = data.lastAnalysis;
  const status = run?.status ?? "QUEUED";
  const inFlight = IN_FLIGHT_ANALYSIS.has(status);
  const failed = FAILED_ANALYSIS.has(status);

  if (!run) return null;

  const started = run.startedAt ?? run.createdAt;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-card px-6 py-8">
        <div
          className={failed ? "space-y-3" : "border-b border-border pb-5"}
        >
          {failed ? (
            <>
              <h2 className="text-base font-semibold tracking-tight">Analysis failed</h2>
              <p className="text-[13px] text-muted-foreground">
                {run.errorMessage
                  ? run.errorMessage
                  : "The blueprint could not be generated from this run."}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={onRetry}>
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
                  Retry analysis
                </Button>
                <Button variant="outline" onClick={onRefresh}>
                  Refresh
                </Button>
              </div>
            </>
          ) : (
            <>
              <AgentRunStatus status={status} />
              <p className="mt-2 text-[13px] text-muted-foreground">
                Fleet is analyzing your business requirements and building a
                structured blueprint of entities, workflows, features, and rules.
              </p>
              <div className="mt-5">
                <BlueprintPipeline current="analyze" />
              </div>
            </>
          )}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          {inFlight && (
            <p className="mb-3 text-[12px] text-muted-foreground">
              Analysis runs as a real Fleet agent. You can leave this page and
              return — the run continues and this panel will reflect its state.
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            aria-expanded={showDetails}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Technical details
            {showDetails ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
          {showDetails && (
            <dl className="mt-2 space-y-1 text-[12px] tabular-nums">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-mono text-foreground">{status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Run ID</dt>
                <dd className="font-mono text-foreground">{run.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-foreground">{formatUpdatedAgo(run.createdAt)}</dd>
              </div>
              {run.errorCode && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Error</dt>
                  <dd className="font-mono text-destructive">{run.errorCode}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}