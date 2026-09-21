"use client";

import { type ReactNode } from "react";
import { FAILED_DEPLOYMENT, IN_FLIGHT_DEPLOYMENT, type PreviewEditorData } from "../types";
import { usePreviewEditor, useCreatePreview } from "../hooks/use-preview-editor";
import { SectionError } from "../../project-detail/components/section-error";
import { LockedStage } from "../../pipeline/components/locked-stage";
import { PipelineSteps } from "../../pipeline/components/steps";
import { DeploymentStatusBadge } from "../../pipeline/components/deployment-status";
import { RunTechnicalDetails } from "../../pipeline/components/run-technical-details";
import { PreviewEmpty } from "./preview-empty";
import { PreviewView } from "./preview-view";

function EditorSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label="Loading preview">
      <div className="h-64 w-full rounded-lg bg-muted/70 animate-pulse" />
      <div className="h-16 w-full rounded-lg bg-muted/70 animate-pulse" />
    </div>
  );
}

function PreviewProgress({ data }: { data: PreviewEditorData }) {
  const d = data.latestPreview;
  if (!d) return null;
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-card px-6 py-8">
        <div className="flex items-center gap-3">
          <DeploymentStatusBadge status={d.status} />
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Fleet is provisioning your preview environment. A live URL appears
          here as soon as provisioning actually completes — nothing is staged.
        </p>
        <div className="mt-5">
          <PipelineSteps current="preview" />
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          The preview continues to build after you leave. This panel reflects the
          deployment&#39;s real persisted state.
        </p>
        <RunTechnicalDetails
          run={{
            status: d.status,
            id: d.id,
            createdAt: d.createdAt,
            errorMessage: null,
            errorCode: null,
          }}
        />
      </div>
    </div>
  );
}

export function PreviewScreen({ projectId }: { projectId: string }) {
  const editor = usePreviewEditor(projectId);
  const create = useCreatePreview(projectId);
  const data = editor.data;

  let body: ReactNode;
  if (!data && editor.isError && !editor.data) {
    body = (
      <div className="mx-auto w-full max-w-2xl">
        <SectionError title="Couldn't load the preview" onRetry={() => editor.refetch()} />
      </div>
    );
  } else if (!data) {
    body = <EditorSkeleton />;
  } else {
    const d = data.latestPreview;
    const inflight = d ? IN_FLIGHT_DEPLOYMENT.has(d.status) : false;
    const failed = d ? FAILED_DEPLOYMENT.has(d.status) : false;
    const ready = d ? !inflight && !failed : false;
    const loadError = create.error?.message ?? null;

    if (!data.hasCompletedBuild) {
      body = (
        <LockedStage
          project={data.project}
          stage="Preview"
          requirement="A preview requires a completed build."
          gap="This project does not have a completed build yet."
          href="/build"
          cta="Go to build"
        />
      );
    } else if (inflight) {
      body = <PreviewProgress data={data} />;
    } else if (ready && d) {
      body = <PreviewView data={data} />;
    } else {
      body = (
        <PreviewEmpty
          hasFailedRun={failed}
          onCreate={() => create.mutate()}
          creating={create.isPending}
          errorMessage={loadError}
        />
      );
    }
  }

  return <div>{body}</div>;
}