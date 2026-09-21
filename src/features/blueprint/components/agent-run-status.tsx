import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; tone: "muted" | "active" | "success" | "destructive" }> = {
  QUEUED: { label: "Preparing analysis", tone: "muted" },
  RUNNING: { label: "Analyzing your idea", tone: "active" },
  IN_PROGRESS: { label: "Analyzing your idea", tone: "active" },
  COMPLETED: { label: "Analysis complete", tone: "success" },
  FAILED: { label: "Analysis failed", tone: "destructive" },
  ERROR: { label: "Analysis failed", tone: "destructive" },
  CANCELLED: { label: "Analysis cancelled", tone: "destructive" },
};

const DOT: Record<string, string> = {
  muted: "bg-muted-foreground",
  active: "bg-primary animate-pulse",
  success: "bg-success",
  destructive: "bg-destructive",
};

/**
 * Reusable, honest AgentRun status indicator (per B12.5): the real persisted
 * status + accessible text. Never shows fake progress or animate dictionaries.
 */
export function AgentRunStatus({
  status,
  description,
}: {
  status: string;
  description?: string;
}) {
  const meta = STATUS_META[status] ?? { label: status, tone: "muted" as const };

  return (
    <span className="inline-flex items-center gap-2" aria-live="polite">
      {meta.tone === "success" ? (
        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
      ) : meta.tone === "destructive" ? (
        <XCircle className="h-4 w-4 text-destructive" aria-hidden />
      ) : (
        <LoaderCircle
          className={cn("h-4 w-4", DOT[meta.tone], meta.tone === "active" ? "animate-spin" : "")}
          aria-hidden
        />
      )}
      <span className="text-[13px] font-medium text-foreground">{meta.label}</span>
      <code className="rounded bg-muted px-1 py-0.5 text-[10.5px] font-medium text-muted-foreground">
        {status}
      </code>
      {description && (
        <span className="text-[12px] text-muted-foreground">{description}</span>
      )}
    </span>
  );
}