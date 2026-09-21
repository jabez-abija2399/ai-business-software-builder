"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Small inline failure state so one section of the Overview can fail without
 * destroying the rest of the page (spec §41–§43).
 */
export function SectionError({
  title,
  onRetry,
  detail,
}: {
  title: string;
  onRetry?: () => void;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <div>
          <div className="text-[13px] font-medium">{title}</div>
          {detail && <p className="mt-0.5 text-[12px] text-muted-foreground">{detail}</p>}
        </div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Retry
        </Button>
      )}
    </div>
  );
}