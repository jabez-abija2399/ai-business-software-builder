"use client";

import { useState, type ReactNode } from "react";
import { Database, FileCode2, FileText, FlaskConical, FolderOpen, StickyNote, Terminal, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionError } from "../../project-detail/components/section-error";
import { LockedStage } from "../../pipeline/components/locked-stage";
import { CodeEmpty } from "./code-empty";
import { CodeChecks } from "./code-checks";
import { CodeFileViewer } from "./code-file-viewer";
import { useCodeEditor, usePublishToGitHub, useRepairFailedTasks } from "../hooks/use-code-editor";
import { CodePublish } from "./code-publish";
import type { WorkspaceFile } from "../types";

const FILE_ICON: Record<string, ReactNode> = {
  SOURCE_FILE: <FileCode2 className="h-4 w-4 text-foreground/70" aria-hidden />,
  SCHEMA: <Database className="h-4 w-4 text-foreground/70" aria-hidden />,
  TEST: <FlaskConical className="h-4 w-4 text-foreground/70" aria-hidden />,
  STYLE: <Wand2 className="h-4 w-4 text-foreground/70" aria-hidden />,
  DOC: <StickyNote className="h-4 w-4 text-foreground/70" aria-hidden />,
  BUILD_LOG: <Terminal className="h-4 w-4 text-foreground/70" aria-hidden />,
};

function EditorSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading workspace">
      <div className="h-24 w-full rounded-lg bg-muted/70 animate-pulse" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
        <div className="h-96 w-full rounded-lg bg-muted/70 animate-pulse" />
        <div className="h-96 w-full rounded-lg bg-muted/70 animate-pulse" />
      </div>
    </div>
  );
}

export function CodeScreen({ projectId }: { projectId: string }) {
  const editor = useCodeEditor(projectId);
  const repair = useRepairFailedTasks(projectId);
  const publish = usePublishToGitHub(projectId);
  const [selected, setSelected] = useState<WorkspaceFile | null>(null);

  const data = editor.data;

  let body: ReactNode;
  if (!data && editor.isError && !editor.data) {
    body = (
      <SectionError title="Couldn't load the workspace" onRetry={() => editor.refetch()} />
    );
  } else if (!data) {
    body = <EditorSkeleton />;
  } else {
    const approved = data.blueprint?.status === "APPROVED";

    if (!approved) {
      body = (
        <LockedStage
          project={data.project}
          stage="Workspace"
          requirement="Generating code requires an approved blueprint."
          gap="This project does not have an approved blueprint yet."
          href="/blueprint"
          cta="Go to blueprint"
        />
      );
    } else if (data.files.length === 0) {
      body = <CodeEmpty projectId={projectId} />;
    } else {
      const viewer = selected ?? data.files[0] ?? null;
      body = (
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-card px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
                  <FolderOpen className="h-4 w-4 text-foreground/70" aria-hidden />
                  Generated workspace
                </h2>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Real files produced by the build worker, read from the sandbox.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1.5 font-normal">
                  <FileCode2 className="h-3.5 w-3.5" aria-hidden />
                  {data.files.length} files
                </Badge>
                <Badge variant="outline" className="gap-1.5 font-normal">
                  <FileCode2 className="h-3.5 w-3.5" aria-hidden />
                  {data.sourceCount} source
                </Badge>
                <Badge variant="outline" className="gap-1.5 font-normal">
                  <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                  {data.testCount} tests
                </Badge>
                <Badge variant="outline" className="gap-1.5 font-normal">
                  <Database className="h-3.5 w-3.5" aria-hidden />
                  {data.hasSchema ? "schema" : "no schema"}
                </Badge>
              </div>
            </div>
          </section>

          <CodeChecks
            checks={data.checks}
            failedTaskTypes={data.failedBuildTaskTypes}
            repairAvailable={data.repairAvailable}
            repairInFlight={data.repairInFlight}
            repairing={repair.isPending}
            onRepair={() => repair.mutate()}
          />

          <CodePublish
            publishRun={data.publishRun}
            files={data.files}
            hasCompletedBuild={data.hasCompletedBuild}
            publishing={publish.isPending}
            publishingError={
              publish.isError ? (publish.error instanceof Error ? publish.error.message : "Publish failed.") : null
            }
            target={publish.data?.target ?? null}
            onPublish={() => publish.mutate()}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
            <div className="flex max-h-[65vh] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                Files
              </div>
              <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                {data.files.map((file) => {
                  const active = file.id === viewer?.id;
                  return (
                    <li key={file.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(file)}
                        aria-current={active ? "true" : undefined}
                        className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active ? "bg-accent" : "hover:bg-muted/60"
                        }`}
                      >
                        {FILE_ICON[file.type] ?? <FileText className="h-4 w-4 text-foreground/70" aria-hidden />}
                        <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground">
                          {file.filePath}
                        </code>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            file.content === null
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {file.content === null ? "missing" : "ok"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {viewer && <CodeFileViewer file={viewer} />}
          </div>
        </div>
      );
    }
  }

  return <div className="space-y-5">{body}</div>;
}