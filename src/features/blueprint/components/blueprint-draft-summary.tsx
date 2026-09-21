import type { ReactElement } from "react";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BlueprintPipeline } from "./blueprint-pipeline";
import { formatUpdatedAgo } from "../../project-detail/lib/format";
import type { BlueprintEditorData } from "../types";

/**
 * Interim §1 boundary: a blueprint row exists but its structured sections
 * (analysis output / approval) land in the upcoming spec sections. Renders
 * only real persisted facts — version, status, timestamps — never invented
 * content.
 */
export function BlueprintDraftSummary({
  data,
}: {
  data: BlueprintEditorData;
}): ReactElement | null {
  const b = data.latestBlueprint;
  if (!b) return null;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-card px-6 py-7 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent">
              <FileText className="h-5 w-5 text-foreground/80" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Blueprint v{b.version}
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground tabular-nums">
                Created {formatUpdatedAgo(b.createdAt)}
              </p>
            </div>
          </div>
          <Badge variant={b.status === "APPROVED" ? "success" : "outline"} className="normal-case">
            {b.status}
          </Badge>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <BlueprintPipeline current={b.status === "APPROVED" ? "design" : "review"} />
        </div>

        <p className="mt-5 text-[13px] text-muted-foreground">
          {b.status === "APPROVED"
            ? "This blueprint is approved — continue to Design when you're ready."
            : "This blueprint was created and is ready for review. Approval and the structured blueprint view are next in the build plan."}
        </p>
      </div>
    </div>
  );
}