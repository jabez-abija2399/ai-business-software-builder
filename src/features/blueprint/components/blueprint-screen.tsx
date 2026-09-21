"use client";

import { type ReactNode, useState } from "react";
import {
  FAILED_ANALYSIS,
  IN_FLIGHT_ANALYSIS,
  type BlueprintEditorData,
} from "../types";
import { useBlueprintEditor, useStartBlueprintAnalysis } from "../hooks/use-blueprint-editor";
import { SectionError } from "../../project-detail/components/section-error";
import { BlueprintEmpty } from "./blueprint-empty";
import { BlueprintDescribe, EXAMPLE_DESCRIPTION } from "./blueprint-describe";
import { BlueprintAnalysisStatus } from "./blueprint-analysis-status";
import { BlueprintDraftSummary } from "./blueprint-draft-summary";

function EditorSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label="Loading blueprint">
      <div className="h-64 w-full rounded-lg bg-muted/70 animate-pulse" />
      <div className="h-16 w-full rounded-lg bg-muted/70 animate-pulse" />
    </div>
  );
}

function FailedBanner() {
  return (
    <div className="mx-auto mb-5 w-full max-w-2xl rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px]">
      <span className="font-medium text-destructive">Your last analysis failed.</span>{" "}
      <span className="text-muted-foreground">
        Your description is preserved below — review it and start analysis again.
      </span>
    </div>
  );
}

function prefillFor(data: BlueprintEditorData): string {
  return data.latestBlueprint?.rawDescription ?? data.project.description ?? "";
}

export function BlueprintScreen({ projectId }: { projectId: string }) {
  const [panel, setPanel] = useState<"default" | "describe">("default");
  const [prefillExample, setPrefillExample] = useState(false);
  const editor = useBlueprintEditor(projectId);
  const startAnalysis = useStartBlueprintAnalysis(projectId);

  const data = editor.data;

  function openDescribe(example: boolean) {
    setPrefillExample(example);
    setPanel("describe");
  }

  function closeDescribe() {
    setPanel("default");
    setPrefillExample(false);
  }

  let body: ReactNode;
  if (!data && editor.isError && !editor.data) {
    body = (
      <div className="mx-auto w-full max-w-2xl">
        <SectionError
          title="Couldn't load the blueprint"
          onRetry={() => editor.refetch()}
        />
      </div>
    );
  } else if (!data) {
    body = <EditorSkeleton />;
  } else {
    const lastStatus = data.lastAnalysis?.status;
    const inFlight =
      lastStatus != null && IN_FLIGHT_ANALYSIS.has(lastStatus) && !data.latestBlueprint?.hasRealContent;
    const failed =
      lastStatus != null &&
      FAILED_ANALYSIS.has(lastStatus) &&
      !data.latestBlueprint?.hasRealContent;

    const prefill = prefillFor(data);

    if (inFlight) {
      body = (
        <BlueprintAnalysisStatus
          status={lastStatus!}
          createdAt={data.lastAnalysis!.createdAt}
        />
      );
    } else if (failed) {
      body = (
        <>
          <FailedBanner />
          <BlueprintDescribe
            initialDescription={prefill}
            canEdit={data.project.canEdit}
            submitting={startAnalysis.isPending}
            errorMessage={startAnalysis.error?.message ?? null}
            onSubmit={(description) => startAnalysis.mutate(description)}
            onBack={closeDescribe}
          />
        </>
      );
    } else if (data.latestBlueprint == null) {
      body =
        panel === "describe" ? (
          <BlueprintDescribe
            initialDescription={prefillExample ? EXAMPLE_DESCRIPTION : prefill}
            canEdit={data.project.canEdit}
            submitting={startAnalysis.isPending}
            errorMessage={startAnalysis.error?.message ?? null}
            onSubmit={(description) => startAnalysis.mutate(description)}
            onBack={closeDescribe}
          />
        ) : (
          <BlueprintEmpty
            project={data.project}
            onStart={() => openDescribe(false)}
            onExample={() => openDescribe(true)}
            previouslyFailed={Boolean(
              lastStatus != null && FAILED_ANALYSIS.has(lastStatus)
            )}
          />
        );
    } else {
      body = <BlueprintDraftSummary data={data} />;
    }
  }

  return <div>{body}</div>;
}