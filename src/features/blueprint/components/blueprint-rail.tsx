"use client";

import { BlueprintOutline, BlueprintSectionJump } from "./blueprint-outline";
import { BlueprintReadiness } from "./blueprint-readiness";
import { BlueprintAttention } from "./blueprint-attention";
import { BlueprintApproval } from "./blueprint-approval";
import type { BlueprintEditorData } from "../types";

export const BLUEPRINT_SECTION_IDS = [
  "business-context",
  "goals",
  "personas",
  "roles",
  "features",
  "entities",
  "workflows",
  "business-rules",
  "integrations",
  "nfrs",
  "notes",
];

/**
 * Right-hand review rail (per C13/C17): blueprint outline + readiness +
 * real issues/decisions + the approval checkpoint. Single source for review.
 */
export function BlueprintRail({
  projectId,
  data,
}: {
  projectId: string;
  data: BlueprintEditorData;
}) {
  return (
    <>
      <BlueprintSectionJump sectionIds={BLUEPRINT_SECTION_IDS} />

      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <BlueprintOutline sectionIds={BLUEPRINT_SECTION_IDS} />
          </div>

          {data.latestBlueprint && data.latestBlueprint.hasContent && (
            <div className="rounded-lg border border-border bg-card p-4">
              <BlueprintReadiness sections={data.latestBlueprint.sections} />
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-4">
            <BlueprintAttention data={data} />
          </div>

          <BlueprintApproval projectId={projectId} data={data} />
        </div>
      </aside>
    </>
  );
}