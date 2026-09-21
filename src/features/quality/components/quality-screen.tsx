"use client";

import { type ReactNode } from "react";
import { FAILED_RUN, IN_FLIGHT_RUN } from "../types";
import { useQualityEditor, useRunQuality } from "../hooks/use-quality-editor";
import { SectionError } from "../../project-detail/components/section-error";
import { LockedStage } from "../../pipeline/components/locked-stage";
import { RunStatusCard } from "../../pipeline/components/run-status-card";
import { QualityEmpty } from "./quality-empty";
import { QualityProgress } from "./quality-progress";
import { QualityView } from "./quality-view";

function EditorSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label="Loading quality checks">
      <div className="h-64 w-full rounded-lg bg-muted/70 animate-pulse" />
      <div className="h-16 w-full rounded-lg bg-muted/70 animate-pulse" />
    </div>
  );
}

export function QualityScreen({ projectId }: { projectId: string }) {
  const editor = useQualityEditor(projectId);
  const run = useRunQuality(projectId);
  const data = editor.data;

  let body: ReactNode;
  if (!data && editor.isError && !editor.data) {
    body = (
      <div className="mx-auto w-full max-w-2xl">
        <SectionError title="Couldn't load quality checks" onRetry={() => editor.refetch()} />
      </div>
    );
  } else if (!data) {
    body = <EditorSkeleton />;
  } else {
    const runs = data.runs;
    const inflight = runs.some((r) => IN_FLIGHT_RUN.has(r.status));
    const failed = runs.some((r) => FAILED_RUN.has(r.status));
    const hasCompleted = runs.some((r) => r.status === "COMPLETED");
    const lastRun = runs[runs.length - 1];
    const loadError = run.error?.message ?? null;

    if (!data.hasCompletedBuild) {
      body = (
        <LockedStage
          project={data.project}
          stage="Quality checks"
          requirement="Quality checks require a completed build."
          gap="This project does not have a completed build yet."
          href="/build"
          cta="Go to build"
        />
      );
    } else if (inflight) {
      body = <QualityProgress data={data} />;
    } else if (data.testRecords.length > 0) {
      body = <QualityView data={data} />;
    } else if (hasCompleted && lastRun) {
      body = (
        <RunStatusCard
          run={{
            id: lastRun.id,
            status: lastRun.status,
            createdAt: lastRun.createdAt,
            errorMessage: lastRun.errorMessage,
            errorCode: null,
          }}
          inFlight={false}
          failed={false}
          completedWithoutContent
          heading="Quality checks completed"
          description="The quality runs completed but produced no test records yet."
          step="quality"
          onRetry={() => run.mutate()}
          onRefresh={() => editor.refetch()}
        />
      );
    } else {
      body = (
        <QualityEmpty
          hasFailedRun={failed}
          onRun={() => run.mutate()}
          running={run.isPending}
          errorMessage={loadError}
        />
      );
    }
  }

  return <div>{body}</div>;
}