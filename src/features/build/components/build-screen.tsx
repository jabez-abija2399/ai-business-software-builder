"use client";

import { type ReactNode } from "react";
import { FAILED_RUN, IN_FLIGHT_RUN, type BuildEditorData } from "../types";
import { useBuildEditor, useStartBuild } from "../hooks/use-build-editor";
import { SectionError } from "../../project-detail/components/section-error";
import { LockedStage } from "../../pipeline/components/locked-stage";
import { BuildEmpty } from "./build-empty";
import { BuildProgress } from "./build-progress";
import { BuildView } from "./build-view";

function EditorSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label="Loading build">
      <div className="h-64 w-full rounded-lg bg-muted/70 animate-pulse" />
      <div className="h-16 w-full rounded-lg bg-muted/70 animate-pulse" />
    </div>
  );
}

export function BuildScreen({ projectId }: { projectId: string }) {
  const editor = useBuildEditor(projectId);
  const build = useStartBuild(projectId);
  const data = editor.data;

  let body: ReactNode;
  if (!data && editor.isError && !editor.data) {
    body = (
      <div className="mx-auto w-full max-w-2xl">
        <SectionError title="Couldn't load the build" onRetry={() => editor.refetch()} />
      </div>
    );
  } else if (!data) {
    body = <EditorSkeleton />;
  } else {
    const approved = data.blueprint?.status === "APPROVED";
    const runs = data.runs;
    const inflight = runs.some((r) => IN_FLIGHT_RUN.has(r.status));
    const loadError = build.error?.message ?? null;

    if (!approved) {
      body = (
        <LockedStage
          project={data.project}
          stage="Build"
          requirement="Building requires an approved blueprint."
          gap="This project does not have an approved blueprint yet."
          href="/blueprint"
          cta="Go to blueprint"
        />
      );
    } else if (inflight) {
      body = <BuildProgress data={data} />;
    } else if (runs.length === 0) {
      body = (
        <BuildEmpty
          hasFailedRun={false}
          onStart={() => build.mutate()}
          starting={build.isPending}
          errorMessage={loadError}
        />
      );
    } else if (data.hasCompletedBuild) {
      body = <BuildView data={data} />;
    } else if (runs.some((r) => FAILED_RUN.has(r.status))) {
      body = (
        <BuildEmpty
          hasFailedRun
          onStart={() => build.mutate()}
          starting={build.isPending}
          errorMessage={loadError}
        />
      );
    } else {
      body = (
        <BuildEmpty
          hasFailedRun={false}
          onStart={() => build.mutate()}
          starting={build.isPending}
          errorMessage={loadError}
        />
      );
    }
  }

  return <div>{body}</div>;
}