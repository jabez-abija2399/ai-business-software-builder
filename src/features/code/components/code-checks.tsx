"use client";

import { CheckCircle2, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IN_FLIGHT_RUN, FAILED_RUN } from "../../pipeline/types";
import type { WorkspaceCheck } from "../types";

const DOT: Record<string, string> = {
  QUEUED: "bg-muted-foreground",
  RUNNING: "bg-primary animate-pulse",
  IN_PROGRESS: "bg-primary animate-pulse",
  COMPLETED: "bg-success",
  FAILED: "bg-destructive",
  ERROR: "bg-destructive",
  CANCELLED: "bg-destructive",
};

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  FAILED: "Failed",
  ERROR: "Error",
  CANCELLED: "Cancelled",
};

/**
 * The real check history for the workspace — one row per check task type
 * (lint, typecheck, tests, security, accessibility, performance), driven by
 * actual AgentRun rows. The repair action re-queues only the genuinely failed
 * build tasks (never fabricates a fix or a green status).
 */
export function CodeChecks({
  checks,
  failedTaskTypes,
  repairAvailable,
  repairInFlight,
  repairing,
  onRepair,
}: {
  checks: WorkspaceCheck[];
  failedTaskTypes: string[];
  repairAvailable: boolean;
  repairInFlight: boolean;
  repairing: boolean;
  onRepair: () => void;
}) {
  const repairable = failedTaskTypes.filter((t) => t !== "INSTALL_DEPENDENCIES");

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold tracking-tight">Checks &amp; repair</h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Real runs across the workspace — typecheck, lint and quality checks.
          </p>
        </div>
        {repairable.length > 0 && (
          <Button
            size="sm"
            onClick={onRepair}
            disabled={!repairAvailable || repairing || repairInFlight}
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
            {repairing ? "Queuing…" : "Re-run failed tasks"}
          </Button>
        )}
      </div>

      {repairable.length > 0 && (
        <div className="border-b border-border bg-accent/40 px-5 py-3">
          <p className="text-[12.5px] text-foreground">
            <span className="font-semibold">Failed build tasks:</span>{" "}
            <span className="font-mono text-[12px]">{repairable.join(", ") || "—"}</span>
            {failedTaskTypes.includes("INSTALL_DEPENDENCIES") && (
              <span className="text-muted-foreground">
                {" "}
                (INSTALL_DEPENDENCIES is exempt — this environment has no network
                sandbox, so it fails for an environmental reason, not a code bug.)
              </span>
            )}
          </p>
        </div>
      )}

      {repairInFlight && (
        <div className="border-b border-border bg-accent/40 px-5 py-3">
          <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
            A build task is queued or running — this panel refreshes until it settles.
          </p>
        </div>
      )}

      {checks.length === 0 ? (
        <div className="px-5 py-6 text-[13px] text-muted-foreground">
          No checks have run yet. Run the build and quality stages to populate the
          workspace checks.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {checks.map((check) => {
            const failed = FAILED_RUN.has(check.status);
            const inflight = IN_FLIGHT_RUN.has(check.status);
            return (
              <li key={check.id} className="flex items-start gap-3 px-5 py-3">
                {check.status === "COMPLETED" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                ) : failed ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                ) : (
                  <LoaderCircle
                    className={`mt-0.5 h-4 w-4 shrink-0 ${inflight ? "animate-spin" : ""} ${
                      DOT[check.status] ?? "text-muted-foreground"
                    }`}
                    aria-hidden
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] font-semibold text-foreground">
                      {check.taskType}
                    </code>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${DOT[check.status] ?? "bg-muted-foreground"}`}
                      aria-hidden
                    />
                    <span className="text-[13px] text-foreground">
                      {STATUS_LABEL[check.status] ?? check.status}
                    </span>
                    {check.completedAt && (
                      <span className="text-[11.5px] text-muted-foreground">
                        {new Date(check.completedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {check.errorMessage && (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-destructive">
                      {check.errorMessage}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}