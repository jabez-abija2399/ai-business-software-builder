import { ShieldCheck } from "lucide-react";
import { PipelineSteps } from "../../pipeline/components/steps";
import { BuildTaskList } from "../../build/components/build-task-list";
import type { QualityEditorData } from "../types";

/**
 * Live quality in-flight panel. Real progress = genuine queued vs completed
 * AgentRun rows for the quality task types.
 */
export function QualityProgress({ data }: { data: QualityEditorData }) {
  const total = data.runs.length;
  const completed = data.runs.filter((r) => r.status === "COMPLETED").length;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-card px-6 py-8">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
          Running quality checks
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Fleet is running tests, security, accessibility, and performance checks
          against your build.
        </p>
        <p className="mt-3 text-[13px] tabular-nums">
          <span className="font-medium text-foreground">{completed}</span>
          <span className="text-muted-foreground"> of {total} checks completed</span>
        </p>
        <div className="mt-4">
          <BuildTaskList runs={data.runs} />
        </div>
        <div className="mt-5">
          <PipelineSteps current="quality" />
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          Quality checks run as real Fleet agents. You can leave this page and
          return — the results reflect their actual state.
        </p>
      </div>
    </div>
  );
}