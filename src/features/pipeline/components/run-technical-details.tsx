"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatUpdatedAgo } from "../../project-detail/lib/format";

export interface RunDetails {
  status: string;
  id: string | null;
  createdAt: string;
  errorMessage: string | null;
  errorCode: string | null;
}

/**
 * Collapsible technical details for any real AgentRun (per the Blueprint
 * panel). Shows exactly what is persisted — status, run id, timestamps and a
 * real error code when one exists. Never invents activity or ETA.
 */
export function RunTechnicalDetails({ run }: { run: RunDetails }) {
  const [open, setOpen] = useState(false);
  if (!run.id) return null;

  return (
    <div className="mt-5 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Technical details
        {open ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
      {open && (
        <dl className="mt-2 space-y-1 text-[12px] tabular-nums">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-mono text-foreground">{run.status}</dd>
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
  );
}