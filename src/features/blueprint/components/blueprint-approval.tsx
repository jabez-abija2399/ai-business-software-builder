"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApproveBlueprint } from "../hooks/use-blueprint-editor";
import { IN_FLIGHT_ANALYSIS, type BlueprintEditorData } from "../types";
import { pendingClarifications } from "../lib/sections";

/**
 * Server-confirmed approval checkpoint (A6/B10). Never optimistically marks
 * the blueprint approved; every state maps to real persisted conditions.
 */
export function BlueprintApproval({ projectId, data }: { projectId: string; data: BlueprintEditorData }) {
  const approve = useApproveBlueprint(projectId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const b = data.latestBlueprint;
  const inFlight = data.lastAnalysis ? IN_FLIGHT_ANALYSIS.has(data.lastAnalysis.status) : false;
  const pendingQuestions = b ? pendingClarifications(b.sections.businessContext) : [];
  const isApproved = b?.status === "APPROVED";

  if (isApproved && b) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4">
        <p className="flex items-center gap-2 text-[13px] font-medium text-success-foreground">
          <Check className="h-4 w-4 text-success" strokeWidth={3} aria-hidden />
          Blueprint approved
        </p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Version {b.version} is approved and will guide the Design stage.
        </p>
        <Button asChild className="mt-3 w-full">
          <Link href={`/projects/${projectId}/design`}>
            Continue to Design
            <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    );
  }

  let blockedReason: React.ReactNode | null = null;
  if (!b || !b.hasContent) {
    blockedReason = (
      <p className="text-[12.5px] text-muted-foreground">
        No analyzed blueprint exists yet. Describe your idea to create one.
      </p>
    );
  } else if (inFlight) {
    blockedReason = (
      <p className="text-[12.5px] text-muted-foreground">
        Approval unavailable — analysis is still running.
      </p>
    );
  } else if (pendingQuestions.length > 0) {
    blockedReason = (
      <p className="text-[12.5px] text-muted-foreground">
        Approval unavailable — more information is required before this blueprint
        can be approved.
      </p>
    );
  } else if (!data.project.isOwner) {
    blockedReason = (
      <p className="text-[12.5px] text-muted-foreground">
        Approval unavailable — only the project owner can approve the blueprint.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        Approval
      </h4>

      {b && b.hasContent && !inFlight && pendingQuestions.length === 0 && data.project.isOwner ? (
        <>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            Approving Version {b.version} confirms this specification is ready to
            guide the Design stage.
          </p>
          <Button className="mt-3 w-full" onClick={() => setConfirmOpen(true)}>
            Approve blueprint
          </Button>
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            Do not approve until you&apos;ve reviewed the sections above.
          </p>
        </>
      ) : (
        <div className="mt-2 space-y-3">
          {blockedReason}
          <Button variant="outline" className="w-full" disabled title="See conditions above">
            Approve blueprint
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve blueprint?</DialogTitle>
            <DialogDescription>
              You&apos;re approving Version {b?.version ?? "—"} as the specification
              for the next stage of this project. After approval you can continue
              to Design.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={approve.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                approve.mutate(undefined, {
                  onSuccess: () => setConfirmOpen(false),
                });
              }}
              disabled={approve.isPending}
            >
              {approve.isPending ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Approving…
                </>
              ) : (
                "Approve blueprint"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {approve.isError && (
        <p className="mt-3 text-[12.5px] text-destructive">
          {approve.error?.message ?? "Couldn't approve the blueprint. The blueprint was not changed."}
        </p>
      )}
    </div>
  );
}