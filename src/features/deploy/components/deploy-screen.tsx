"use client";

import { type ReactNode } from "react";
import { useDeployEditor, useCreateDeployment } from "../hooks/use-deploy-editor";
import { SectionError } from "../../project-detail/components/section-error";
import { LockedStage } from "../../pipeline/components/locked-stage";
import { DeployView } from "./deploy-view";

function EditorSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label="Loading deployments">
      <div className="h-64 w-full rounded-lg bg-muted/70 animate-pulse" />
      <div className="h-16 w-full rounded-lg bg-muted/70 animate-pulse" />
    </div>
  );
}

export function DeployScreen({ projectId }: { projectId: string }) {
  const editor = useDeployEditor(projectId);
  const deploy = useCreateDeployment(projectId);
  const data = editor.data;

  let body: ReactNode;
  if (!data && editor.isError && !editor.data) {
    body = (
      <div className="mx-auto w-full max-w-2xl">
        <SectionError title="Couldn't load deployments" onRetry={() => editor.refetch()} />
      </div>
    );
  } else if (!data) {
    body = <EditorSkeleton />;
  } else if (!data.hasCompletedPreview) {
    body = (
      <LockedStage
        project={data.project}
        stage="Deploy"
        requirement="Deployment requires a completed preview environment."
        gap="This project has no completed preview yet."
        href="/preview"
        cta="Go to preview"
      />
    );
  } else {
    body = (
      <DeployView
        data={data}
        creatingEnv={deploy.variables ?? null}
        errorMessage={deploy.error?.message ?? null}
        onCreate={(environment) => deploy.mutate(environment)}
      />
    );
  }

  return <div>{body}</div>;
}