import { CheckCircle2, Circle, LoaderCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const META: Record<string, { label: string; tone: "muted" | "active" | "success" | "destructive" }> = {
  PENDING: { label: "Pending", tone: "muted" },
  QUEUED: { label: "Queued", tone: "muted" },
  BUILDING: { label: "Building", tone: "active" },
  DEPLOYING: { label: "Deploying", tone: "active" },
  READY: { label: "Ready", tone: "success" },
  COMPLETED: { label: "Ready", tone: "success" },
  SUCCESS: { label: "Ready", tone: "success" },
  FAILED: { label: "Failed", tone: "destructive" },
  ERROR: { label: "Error", tone: "destructive" },
  CANCELLED: { label: "Cancelled", tone: "destructive" },
};

export function DeploymentStatusBadge({ status }: { status: string }) {
  const meta = META[status] ?? { label: status, tone: "muted" as const };
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