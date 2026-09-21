import { CheckCircle2, Circle, LoaderCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineRunStatus } from "../../pipeline/types";
import { buildTaskLabel } from "../types";
import { formatUpdatedAgo } from "../../project-detail/lib/format";

const STATUS_META: Record<string, { label: string; tone: "muted" | "active" | "success" | "destructive" }> = {
  QUEUED: { label: "Queued", tone: "muted" },
  RUNNING: { label: "Running", tone: "active" },
  IN_PROGRESS: { label: "Running", tone: "active" },
  PENDING: { label: "Pending", tone: "muted" },
  COMPLETED: { label: "Completed", tone: "success" },
  FAILED: { label: "Failed", tone: "destructive" },
  ERROR: { label: "Error", tone: "destructive" },
  CANCELLED: { label: "Cancelled", tone: "destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "muted" as const };
  const Icon =
    meta.tone === "success"
      ? CheckCircle2
      : meta.tone === "destructive"
        ? XCircle
        : meta.tone === "active"
          ? LoaderCircle
          : Circle;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        meta.tone === "success" && "bg-success/10 text-success-foreground",
        meta.tone === "destructive" && "bg-destructive/10 text-destructive",
        meta.tone === "active" && "bg-primary/10 text-primary",
        meta.tone === "muted" && "bg-muted text-muted-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-3 w-3",
          meta.tone === "active" && "animate-spin",
          meta.tone === "success" && "text-success",
          meta.tone === "destructive" && "text-destructive"
        )}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}

export function BuildTaskList({
  runs,
  withErrorDetail = true,
}: {
  runs: { id: string; taskType: string; status: PipelineRunStatus; createdAt: string; completedAt: string | null; errorMessage: string | null }[];
  withErrorDetail?: boolean;
}) {
  if (runs.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No build tasks have been created yet.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {runs.map((run) => (
        <li key={run.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium text-foreground">
              {buildTaskLabel(run.taskType)}
            </p>
            <p className="text-[11.5px] text-muted-foreground tabular-nums">
              {run.completedAt ? `Completed ${formatUpdatedAgo(run.completedAt)}` : `Queued ${formatUpdatedAgo(run.createdAt)}`}
            </p>
            {withErrorDetail && run.errorMessage && (
              <p className="mt-0.5 text-[11.5px] text-destructive">{run.errorMessage}</p>
            )}
          </div>
          <StatusBadge status={run.status} />
        </li>
      ))}
    </ul>
  );
}