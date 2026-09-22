import { CheckCircle2, Circle, LoaderCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChipTone = "muted" | "active" | "success" | "destructive";

const STATUS_META: Record<string, { label: string; tone: ChipTone }> = {
  QUEUED: { label: "Queued", tone: "muted" },
  RUNNING: { label: "Running", tone: "active" },
  IN_PROGRESS: { label: "In progress", tone: "active" },
  PENDING: { label: "Pending", tone: "muted" },
  BUILDING: { label: "Building", tone: "active" },
  DEPLOYING: { label: "Deploying", tone: "active" },
  COMPLETED: { label: "Completed", tone: "success" },
  READY: { label: "Ready", tone: "success" },
  SUCCESS: { label: "Success", tone: "success" },
  FAILED: { label: "Failed", tone: "destructive" },
  ERROR: { label: "Error", tone: "destructive" },
  CANCELLED: { label: "Cancelled", tone: "destructive" },
  UP: { label: "Up", tone: "success" },
  DOWN: { label: "Down", tone: "destructive" },
  PROVISIONING: { label: "Provisioning", tone: "active" },
  UNKNOWN: { label: "Not checked", tone: "muted" },
};

/** Small honest status pill shared across the Monitoring and Health views. */
export function StatusChip({ value }: { value: string }) {
  const meta = STATUS_META[value] ?? { label: value, tone: "muted" as ChipTone };
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
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
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