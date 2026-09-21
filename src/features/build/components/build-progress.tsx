import { Wrench } from "lucide-react";
import { PipelineSteps } from "../../pipeline/components/steps";
import { BuildTaskList } from "./build-task-list";
import type { BuildEditorData } from "../types";

/**
 * Live build in-flight/progress panel. Real progress = the number of queued vs
 * completed genuine AgentRun rows; nothing is estimated or embellished.
 */
export function BuildProgress({ data }: { data: BuildEditorData }) {
  const total = data.runs.length;
  const completed = data.runs.filter((r) => r.status === "COMPLETED").length;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-card px-6 py-8">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Wrench className="h-4 w-4 text-muted-foreground" aria-hidden />
          Building your application
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Fleet agents are generating the application from your approved
          blueprint. Each task below is a real agent run.
        </p>
        <p className="mt-3 text-[13px] tabular-nums">
          <span className="font-medium text-foreground">{completed}</span>
          <span className="text-muted-foreground"> of {total} build tasks completed</span>
        </p>
        <div className="mt-4">
          <BuildTaskList runs={data.runs} />
        </div>
        <div className="mt-5">
          <PipelineSteps current="build" />
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          The build runs as real Fleet agents. You can leave this page and return —
          the task list reflects their actual state.
        </p>
      </div>
    </div>
  );
}