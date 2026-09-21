import Link from "next/link";
import { AlertTriangle, ArrowRight, XCircle } from "lucide-react";
import { SectionBlock } from "./section";
import { formatTimeAgo } from "../lib/format";
import type { AttentionItem } from "../types";
import { cn } from "@/lib/utils";

export function ProjectAttention({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <SectionBlock className="border-destructive/30">
      <div className="px-5 pt-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
          <h2 className="text-[15px] font-semibold tracking-tight">Needs attention</h2>
        </div>
      </div>
      <div className="px-5 pb-4 pt-1">
        <ul className="divide-y divide-border/60">
          {items.map((item, idx) => (
            <li
              key={`${item.title}-${idx}`}
              className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4"
            >
              {item.severity === "error" ? (
                <XCircle className="hidden h-4 w-4 self-center text-destructive sm:block" aria-hidden />
              ) : (
                <AlertTriangle className="hidden h-4 w-4 self-center text-warning sm:block" aria-hidden />
              )}
              <div className="min-w-[0]">
                <div className="text-[13px] font-medium">{item.title}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {item.detail}
                  {item.lastAt && (
                    <span className="ml-1 text-muted-foreground/80">
                      · last {formatTimeAgo(item.lastAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                {item.count > 1 && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {item.count}×
                  </span>
                )}
                <Link
                  href={item.actionHref}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md text-[12px] font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    item.severity === "error" ? "text-destructive" : ""
                  )}
                >
                  {item.actionLabel}
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SectionBlock>
  );
}