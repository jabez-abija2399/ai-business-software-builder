import Link from "next/link";
import {
  CheckCircle2,
  CircleDot,
  GitBranch,
  Hammer,
  Scale,
  XCircle,
} from "lucide-react";
import { SectionBlock } from "./section";
import { formatTimeAgo } from "../lib/format";
import type { ProjectActivityItem } from "../types";
import { cn } from "@/lib/utils";

const TYPE_META = {
  run: { icon: Hammer, label: "Run" },
  deployment: { icon: GitBranch, label: "Deployment" },
  approval: { icon: Scale, label: "Approval" },
  decision: { icon: CircleDot, label: "Decision" },
} as const;

function statusTone(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("fail") || normalized.includes("error")) {
    return "text-destructive";
  }
  if (normalized.includes("complet") || normalized.includes("success") || normalized.includes("active")) {
    return "text-success";
  }
  if (normalized.includes("pend") || normalized.includes("queued") || normalized.includes("proposed")) {
    return "text-warning";
  }
  return "text-info";
}

function ActivityIcon({ type, status }: { type: ProjectActivityItem["type"]; status: string }) {
  const Icon = TYPE_META[type].icon;
  const failed = /fail|error/i.test(status);
  return failed ? (
    <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
  ) : status.toLowerCase().includes("completed") ||
    status.toLowerCase().includes("active") ? (
    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
  ) : (
    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
  );
}

export function ProjectRecentActivity({ items }: { items: ProjectActivityItem[] }) {
  return (
    <SectionBlock>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Recent activity</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Runs, deployments, approvals and decisions
          </p>
        </div>
      </div>

      <div className="px-2 pb-2">
        {items.length === 0 ? (
          <p className="px-3 pb-6 pt-2 text-center text-[13px] text-muted-foreground">
            No activity yet. Once your project starts building, runs and
            deployments will appear here.
          </p>
        ) : (
          <ul className="mt-1">
            {items.map((item) => {
              const meta = TYPE_META[item.type];
              return (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ActivityIcon type={item.type} status={item.status} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium capitalize">
                          {item.title}
                        </span>
                        <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                          {meta.label}
                        </span>
                      </div>
                      {item.subtitle && (
                        <div className="truncate text-[11px] text-muted-foreground">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "hidden text-[12px] font-medium tabular-nums sm:inline",
                          statusTone(item.status)
                        )}
                      >
                        {item.status}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {formatTimeAgo(item.at)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SectionBlock>
  );
}