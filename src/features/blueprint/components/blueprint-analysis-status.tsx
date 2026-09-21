import { LoaderCircle } from "lucide-react";
import { BlueprintPipeline } from "./blueprint-pipeline";
import type { BlueprintAnalysisStatus } from "../types";
import { formatUpdatedAgo } from "../../project-detail/lib/format";

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Queued — Fleet will start analyzing shortly",
  RUNNING: "Analysis in progress",
  IN_PROGRESS: "Analysis in progress",
  COMPLETED: "Analysis complete",
  FAILED: "Analysis failed",
  ERROR: "Analysis failed",
  CANCELLED: "Analysis cancelled",
};

/**
 * §1 (minimal) — Honest run feedback driven by the real AgentRun row. No fake
 * percentage, no invented stages: just the true persisted status.
 */
export function BlueprintAnalysisStatus({
  status,
  createdAt,
}: {
  status: BlueprintAnalysisStatus;
  createdAt: string;
}) {
  const failed = status === "FAILED" || status === "ERROR" || status === "CANCELLED";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-card px-6 py-8">
        <div className="flex items-center gap-3">
          {!failed && (
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden />
          )}
          <div>
            <div className="text-[15px] font-semibold tracking-tight">
              {STATUS_LABEL[status] ?? status}
            </div>
            <div className="mt-0.5 text-[12px] text-muted-foreground tabular-nums">
              Run status: {status} · started {formatUpdatedAgo(createdAt)}
            </div>
          </div>
        </div>

        {!failed && (
          <div className="mt-6 border-t border-border pt-5">
            <BlueprintPipeline current="analyze" />
          </div>
        )}
      </div>
    </div>
  );
}