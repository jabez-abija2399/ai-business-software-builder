import { AlertTriangle, CheckCircle2, Clock, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthState } from "../types";

const HEALTH_META: Record<
  HealthState["level"],
  { icon: typeof CheckCircle2; iconClass: string; dotClass: string }
> = {
  operational: {
    icon: CheckCircle2,
    iconClass: "text-success",
    dotClass: "bg-success",
  },
  building: {
    icon: Loader2,
    iconClass: "text-info",
    dotClass: "bg-info",
  },
  attention: {
    icon: AlertTriangle,
    iconClass: "text-warning",
    dotClass: "bg-warning",
  },
  degraded: {
    icon: AlertTriangle,
    iconClass: "text-destructive",
    dotClass: "bg-destructive",
  },
  incomplete: {
    icon: Info,
    iconClass: "text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

export function ProjectHealth({ health }: { health: HealthState }) {
  const meta = HEALTH_META[health.level];
  const Icon = meta.icon;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3.5"
    >
      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center", meta.iconClass)}>
        <Icon
          className={cn("h-5 w-5", health.level === "building" && "animate-spin")}
          aria-hidden
        />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold">{health.title}</span>
          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden />
        </div>
        {health.subtitle && (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{health.subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function ClockIcon() {
  return <Clock className="h-3.5 w-3.5" aria-hidden />;
}