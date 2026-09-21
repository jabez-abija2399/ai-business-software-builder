"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, PencilLine } from "lucide-react";
import {
  FAILED_ANALYSIS,
  IN_FLIGHT_ANALYSIS,
  type BlueprintEditorData,
} from "../types";
import { useBlueprintEditor, useStartBlueprintAnalysis } from "../hooks/use-blueprint-editor";
import { SectionError } from "../../project-detail/components/section-error";
import { BlueprintEmpty } from "./blueprint-empty";
import { BlueprintDescribe, EXAMPLE_DESCRIPTION } from "./blueprint-describe";
import { BlueprintAnalysisPanel } from "./blueprint-analysis-panel";
import { ClarificationCard } from "./clarification-card";
import { BlueprintSections } from "./blueprint-sections";
import { BlueprintRail } from "./blueprint-rail";
import { VersionHistory } from "./version-history";
import { pendingClarifications } from "../lib/sections";
import { formatUpdatedAgo } from "../../project-detail/lib/format";

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

function CompletedWithoutContent({
  onRefresh,
  onRetry,
}: {
  onRefresh: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-lg border border-border bg-card px-6 py-8">
      <h2 className="text-base font-semibold tracking-tight">Analysis completed</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        The blueprint result is not currently available for this run.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={onRefresh}>Refresh</Button>
        <Button onClick={onRetry}>Start a new analysis</Button>
      </div>
    </div>
  );
}

function ReviewHeader({
  data,
  onEditDescription,
}: {
  data: BlueprintEditorData;
  onEditDescription: () => void;
}) {
  const b = data.latestBlueprint;
  if (!b) return null;
  const approved = b.status === "APPROVED";

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg font-semibold tracking-tight">Blueprint</h2>
          <Badge variant="outline" className="font-normal normal-case">
            Version {b.version}
          </Badge>
          <Badge
            variant={approved ? "success" : b.status === "REVIEWING" ? "warning" : "secondary"}
            className="font-normal normal-case"
          >
            {approved ? "Approved" : b.status === "REVIEWING" ? "Ready for review" : b.status}
          </Badge>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground tabular-nums">
          Draft created {formatUpdatedAgo(b.createdAt)}
          {b.approvedAt ? ` · approved ${formatUpdatedAgo(b.approvedAt)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!approved && (
          <Button variant="outline" size="sm" onClick={onEditDescription}>
            <PencilLine className="mr-2 h-4 w-4" aria-hidden />
            Edit description
          </Button>
        )}
        <VersionHistory projectId={data.project.id} data={data} />
      </div>
    </div>
  );
}

function SourceDescription({ data }: { data: BlueprintEditorData }) {
  const raw = data.latestBlueprint?.rawDescription;
  const b = data.latestBlueprint;
  if (!raw || !b) return null;
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Product description
        </p>
        <span className="text-[11.5px] text-muted-foreground tabular-nums">
          Last saved {formatUpdatedAgo(b.createdAt)}
        </span>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
        {raw}
      </p>
      <p className="mt-2 text-[11.5px] text-muted-foreground">
        This is the source description. The structured blueprint below is
        generated from it — reviewing the blueprint does not change this text.
      </p>
    </div>
  );
}

export function BlueprintScreen({ projectId }: { projectId: string }) {
  const [panel, setPanel] = useState<"default" | "describe">("default");
  const [describePrefill, setDescribePrefill] = useState("");
  const editor = useBlueprintEditor(projectId);
  const startAnalysis = useStartBlueprintAnalysis(projectId);

  const data = editor.data;

  function openDescribe(prefill: string) {
    setDescribePrefill(prefill);
    setPanel("describe");
  }

  function closeDescribe() {
    setPanel("default");
    setDescribePrefill("");
  }

  let body: ReactNode;
  if (!data && editor.isError && !editor.data) {
    body = (
      <div className="mx-auto w-full max-w-2xl">
        <SectionError title="Couldn't load the blueprint" onRetry={() => editor.refetch()} />
      </div>
    );
  } else if (!data) {
    body = <EditorSkeleton />;
  } else {
    const lastStatus = data.lastAnalysis?.status;
    const inFlight = lastStatus != null && IN_FLIGHT_ANALYSIS.has(lastStatus);
    const failed = lastStatus != null && FAILED_ANALYSIS.has(lastStatus);
    const b = data.latestBlueprint;
    const clarifyPending = b ? pendingClarifications(b.sections.businessContext) : [];
    const prefill = b?.rawDescription ?? data.project.description ?? "";

    if (inFlight) {
      body = (
        <BlueprintAnalysisPanel
          data={data}
          onRetry={() => openDescribe(prefill)}
          onRefresh={() => editor.refetch()}
        />
      );
    } else if (clarifyPending.length > 0) {
      body = (
        <ClarificationCard
          projectId={projectId}
          data={data}
          questions={clarifyPending}
          onStartAnalysis={(description) => startAnalysis.mutate(description)}
        />
      );
    } else if (b && b.hasContent) {
      body = (
        <div className="space-y-6">
          <ReviewHeader data={data} onEditDescription={() => openDescribe(prefill)} />
          {b.status === "APPROVED" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
              <p className="flex items-center gap-2 text-[13px] font-medium text-success-foreground">
                <Check className="h-4 w-4 text-success" strokeWidth={3} aria-hidden />
                Version {b.version} is approved
                {b.approvedAt ? ` (${formatUpdatedAgo(b.approvedAt)})` : ""}. Use it as the foundation
                for the Design stage.
              </p>
              <Button asChild size="sm">
                <Link href={`/projects/${projectId}/design`}>Continue to Design</Link>
              </Button>
            </div>
          )}
          <SourceDescription data={data} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]">
            <BlueprintSections sections={b.sections} />
            <BlueprintRail projectId={projectId} data={data} />
          </div>
        </div>
      );
    } else if (lastStatus === "COMPLETED") {
      body = (
        <CompletedWithoutContent
          onRefresh={() => editor.refetch()}
          onRetry={() => openDescribe(prefill)}
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
    } else if (b == null) {
      body =
        panel === "describe" ? (
          <BlueprintDescribe
            initialDescription={describePrefill}
            canEdit={data.project.canEdit}
            submitting={startAnalysis.isPending}
            errorMessage={startAnalysis.error?.message ?? null}
            onSubmit={(description) => startAnalysis.mutate(description)}
            onBack={closeDescribe}
          />
        ) : (
          <BlueprintEmpty
            project={data.project}
            onStart={() => openDescribe(data.project.description ?? "")}
            onExample={() => openDescribe(EXAMPLE_DESCRIPTION)}
            previouslyFailed={Boolean(lastStatus != null && FAILED_ANALYSIS.has(lastStatus))}
          />
        );
    } else {
      body = (
        <BlueprintDescribe
          initialDescription={prefill}
          canEdit={data.project.canEdit}
          submitting={startAnalysis.isPending}
          errorMessage={startAnalysis.error?.message ?? null}
          onSubmit={(description) => startAnalysis.mutate(description)}
          onBack={closeDescribe}
        />
      );
    }
  }

  return <div>{body}</div>;
}