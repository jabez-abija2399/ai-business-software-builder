import { FileSearch } from "lucide-react";
import { PipelineSteps } from "../../pipeline/components/steps";
import { BuildTaskList } from "../../build/components/build-task-list";
import type { ReviewEditorData } from "../types";
import { reviewTaskLabel } from "../types";

/**
 * Live review in-flight panel. Real progress = genuine queued vs completed
 * AgentRun rows for the review task types.
 */
export function ReviewProgress({ data }: { data: ReviewEditorData }) {
  const total = data.runs.length;
  const completed = data.runs.filter((r) => r.status === "COMPLETED").length;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-card px-6 py-8">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <FileSearch className="h-4 w-4 text-muted-foreground" aria-hidden />
          Running review agents
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Fleet is writing documentation and reviewing your generated files.
          {data.runs[0]
            ? ` Current: ${reviewTaskLabel(data.runs[0].taskType)}`
            : ""}
        </p>
        <p className="mt-3 text-[13px] tabular-nums">
          <span className="font-medium text-foreground">{completed}</span>
          <span className="text-muted-foreground"> of {total} agents completed</span>
        </p>
        <div className="mt-4">
          <BuildTaskList runs={data.runs} />
        </div>
        <div className="mt-5">
          <PipelineSteps current="review" />
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          Review agents run as real Fleet agents. You can leave this page and
          return — the README and report reflect their actual state.
        </p>
      </div>
    </div>
  );
}