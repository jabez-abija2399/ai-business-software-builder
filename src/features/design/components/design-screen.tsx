"use client";

import { type ReactNode } from "react";
import { FAILED_RUN, IN_FLIGHT_RUN, type DesignEditorData } from "../types";
import { useDesignEditor, useStartDesignGeneration } from "../hooks/use-design-editor";
import { SectionError } from "../../project-detail/components/section-error";
import { LockedStage } from "../../pipeline/components/locked-stage";
import { RunStatusCard } from "../../pipeline/components/run-status-card";
import { DesignEmpty } from "./design-empty";
import { DesignView } from "./design-view";

function EditorSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label="Loading design">
      <div className="h-64 w-full rounded-lg bg-muted/70 animate-pulse" />
      <div className="h-16 w-full rounded-lg bg-muted/70 animate-pulse" />
    </div>
  );
}

export function DesignScreen({ projectId }: { projectId: string }) {
  const editor = useDesignEditor(projectId);
  const generate = useStartDesignGeneration(projectId);
  const data = editor.data;

  function start() {
    generate.mutate();
  }

  let body: ReactNode;
  if (!data && editor.isError && !editor.data) {
    body = (
      <div className="mx-auto w-full max-w-2xl">
        <SectionError title="Couldn't load the design" onRetry={() => editor.refetch()} />
      </div>
    );
  } else if (!data) {
    body = <EditorSkeleton />;
  } else {
    const approved = data.blueprint?.status === "APPROVED";
    const run = data.lastDesignRun
      ? {
          id: data.lastDesignRun.id,
          status: data.lastDesignRun.status,
          createdAt: data.lastDesignRun.createdAt,
          errorMessage: data.lastDesignRun.errorMessage,
          errorCode: data.lastDesignRun.errorCode,
        }
      : null;
    const inFlight = run ? IN_FLIGHT_RUN.has(run.status) : false;
    const failed = run ? FAILED_RUN.has(run.status) : false;
    const design = data.latestDesign;
    const loadError = generate.error?.message ?? null;

    if (!approved) {
      body = (
        <LockedStage
          project={data.project}
          stage="Design"
          requirement="Design generation requires an approved blueprint."
          gap="This project does not have an approved blueprint yet."
          href="/blueprint"
          cta="Go to blueprint"
        />
      );
    } else if (inFlight) {
      body = (
        <RunStatusCard
          run={run!}
          inFlight
          failed={false}
          heading="Generating your design"
          description="Fleet is turning your approved blueprint into design tokens, components, pages, and flows."
          step="design"
          onRetry={start}
          onRefresh={() => editor.refetch()}
        />
      );
    } else if (design && design.hasContent) {
      body = <DesignView data={data} />;
    } else if (run && run.status === "COMPLETED") {
      body = (
        <RunStatusCard
          run={run}
          inFlight={false}
          failed={false}
          completedWithoutContent
          heading="Design generation completed"
          description="The design run completed but produced no renderable output yet."
          step="design"
          onRetry={start}
          onRefresh={() => editor.refetch()}
        />
      );
    } else if (failed) {
      const runWithError: typeof run = run
        ? { id: run.id, status: run.status, createdAt: run.createdAt, errorMessage: run.errorMessage, errorCode: run.errorCode }
        : null;
      body = (
        <>
          {runWithError && (
            <div className="mx-auto mb-5 w-full max-w-2xl rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px]">
              <span className="font-medium text-destructive">Your last design run failed.</span>{" "}
              <span className="text-muted-foreground">
                {data.lastDesignRun?.errorMessage ?? "It produced no design and can be retried."}
              </span>
            </div>
          )}
          <DesignEmpty
            hasFailedRun
            onGenerate={start}
            generating={generate.isPending}
            errorMessage={loadError}
          />
        </>
      );
    } else {
      body = (
        <DesignEmpty
          hasFailedRun={false}
          onGenerate={start}
          generating={generate.isPending}
          errorMessage={loadError}
        />
      );
    }
  }

  return <div>{body}</div>;
}