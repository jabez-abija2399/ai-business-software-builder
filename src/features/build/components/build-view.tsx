"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileCode2 } from "lucide-react";
import { BlueprintSection } from "../../blueprint/components/blueprint-section";
import { BuildTaskList } from "./build-task-list";
import { formatUpdatedAgo } from "../../project-detail/lib/format";
import type { BuildEditorData } from "../types";

export function BuildView({ data }: { data: BuildEditorData }) {
  const completed = data.runs.filter((r) => r.status === "COMPLETED").length;
  const total = data.runs.length;
  const artifactsDefined = data.artifacts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight">Build</h2>
            <Badge
              variant={completed === total && total > 0 ? "success" : "warning"}
              className="font-normal normal-case"
            >
              {completed === total && total > 0
                ? "Build complete"
                : `${completed} of ${total} tasks completed`}
            </Badge>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground tabular-nums">
            {total > 0
              ? `Last build activity ${formatUpdatedAgo(data.runs[0]?.createdAt ?? "")}`
              : "No build activity yet"}
            {data.blueprint ? ` · from blueprint v${data.blueprint.version}` : ""}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/projects/${data.project.id}/quality`}>
            Continue to Quality
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-border">
          <BlueprintSection
            id="tasks"
            title="Build tasks"
            description="Real agent runs for each build stage"
            status="defined"
          >
            <BuildTaskList runs={data.runs} />
          </BlueprintSection>
        </div>

        <div className="rounded-lg border border-border">
          <BlueprintSection
            id="artifacts"
            title="Generated files"
            description="Source artifacts written by the build"
            status={artifactsDefined ? "defined" : "missing"}
          >
            {artifactsDefined ? (
              <ul className="space-y-1">
                {data.artifacts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-2.5 py-1.5 text-[13px]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileCode2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <code className="truncate text-[12px] text-foreground">{a.filePath}</code>
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      v{a.version} · {a.type}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                No generated files have been persisted for this build yet.
              </p>
            )}
          </BlueprintSection>
        </div>
      </div>
    </div>
  );
}