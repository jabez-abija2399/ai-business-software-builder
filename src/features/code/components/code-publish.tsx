"use client";

import { ExternalLink, GitBranch, Github, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { IN_FLIGHT_RUN } from "../../pipeline/types";
import type { PublishRun, WorkspaceFile } from "../types";

function statusLabel(status: string): string {
  switch (status) {
    case "QUEUED":
    case "RUNNING":
    case "IN_PROGRESS":
      return "Publishing…";
    case "COMPLETED":
      return "Published";
    case "FAILED":
    case "ERROR":
      return "Publish failed";
    default:
      return status;
  }
}

/**
 * Publishes the real generated workspace to GitHub via the worker. Everything
 * shown comes from persisted state: the run status, the real repo URL + commit
 * sha read from the publish report on disk, and any genuine error message.
 */
export function CodePublish({
  publishRun,
  files,
  hasCompletedBuild,
  publishing,
  publishingError,
  target,
  onPublish,
}: {
  publishRun: PublishRun | null;
  files: WorkspaceFile[];
  hasCompletedBuild: boolean;
  publishing: boolean;
  publishingError: string | null;
  target: string | null;
  onPublish: () => void;
}) {
  const report = files.find((f) => f.filePath === "reports/publish-github.log");
  const reportContent = report?.content ?? "";
  const repoUrl = reportContent.match(/^url:\s*(\S+)$/m)?.[1] ?? null;
  const commitSha = reportContent.match(/^commit:\s*([0-9a-f]+)$/m)?.[1] ?? null;

  const inflight = publishRun ? IN_FLIGHT_RUN.has(publishRun.status) : false;

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg border border-border bg-muted/50 p-1.5">
            <Github className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight">GitHub</h2>
            <p className="mt-0.5 max-w-[36rem] text-[12.5px] text-muted-foreground">
              Pushes the real generated files from the worker sandbox to a
              repository so the project is version-controlled.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onPublish}
          disabled={!hasCompletedBuild || publishing || inflight}
        >
          {publishing || inflight ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Publishing…
            </>
          ) : (
            <>
              <GitBranch className="mr-2 h-4 w-4" aria-hidden />
              Publish to GitHub
            </>
          )}
        </Button>
      </div>

      <div className="px-5 py-4">
        {!hasCompletedBuild && (
          <p className="text-[12.5px] text-muted-foreground">
            Run the build first — publishing requires generated files on disk.
          </p>
        )}

        {target && (
          <p className="mb-3 rounded bg-accent/50 px-3 py-2 font-mono text-[12px] text-foreground">
            Target: {target}
          </p>
        )}

        {publishingError && (
          <p className="mb-3 rounded bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
            {publishingError}
          </p>
        )}

        {publishRun ? (
          <div className="flex items-start gap-2.5">
            {publishRun.status === "COMPLETED" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            ) : IN_FLIGHT_RUN.has(publishRun.status) ? (
              <LoaderCircle className="mt-0.5 h-4 w-4 animate-spin shrink-0 text-primary" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-foreground">{statusLabel(publishRun.status)}</span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {publishRun.status}
                </code>
                {publishRun.completedAt && (
                  <span className="text-[11.5px] text-muted-foreground">
                    {new Date(publishRun.completedAt).toLocaleString()}
                  </span>
                )}
              </div>
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {repoUrl}
                </a>
              )}
              {commitSha && (
                <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                  commit {commitSha.slice(0, 7)}
                </p>
              )}
              {publishRun.errorMessage && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-destructive">
                  {publishRun.errorMessage}
                </p>
              )}
              {publishRun.status === "COMPLETED" && !reportContent && (
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  The publish report is no longer on disk — read the recorded
                  artifact metadata to verify.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            No publish has been made for this project yet.
          </p>
        )}
      </div>
    </section>
  );
}