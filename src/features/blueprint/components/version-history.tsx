"use client";

import { useState } from "react";
import { ArrowLeft, History, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useBlueprintVersion } from "../hooks/use-blueprint-editor";
import { SectionError } from "../../project-detail/components/section-error";
import { BlueprintSections } from "./blueprint-sections";
import { formatUpdatedAgo } from "../../project-detail/lib/format";
import { cn } from "@/lib/utils";
import type { BlueprintEditorData } from "../types";
import type { BlueprintVersionData } from "../api";

function toDisplayVersion(v: BlueprintVersionData): NonNullable<BlueprintEditorData["latestBlueprint"]> {
  return {
    id: v.id,
    version: v.version,
    status: v.status,
    createdAt: v.createdAt,
    approvedAt: v.approvedAt,
    rawDescription: null,
    hasContent: true,
    sections: {
      businessContext: v.businessContextJson,
      goals: v.goalsJson ?? [],
      personas: v.personasJson ?? [],
      roles: v.rolesJson ?? [],
      permissions: v.permissionsJson ?? [],
      features: v.featuresJson ?? [],
      entities: v.entitiesJson ?? [],
      workflows: v.workflowsJson ?? [],
      businessRules: v.businessRulesJson ?? [],
      integrations: v.integrationsJson ?? [],
      nfrs: v.nfrJson ?? [],
      notes: v.notes,
    },
  };
}

function VersionStatusBadge({ status, isCurrent }: { status: string; isCurrent?: boolean }) {
  if (isCurrent) {
    return (
      <Badge variant="default" className="font-normal normal-case">
        Current
      </Badge>
    );
  }
  return (
    <Badge
      variant={status === "APPROVED" ? "success" : status === "ARCHIVED" ? "outline" : "secondary"}
      className="font-normal normal-case"
    >
      {status}
    </Badge>
  );
}

/**
 * Read-only version history (A7): real persisted versions, no fabricated
 * metadata. Older versions open in an inline read-only review.
 */
export function VersionHistory({ projectId, data }: { projectId: string; data: BlueprintEditorData }) {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);

  const versionQuery = useBlueprintVersion(projectId, viewing);
  const version = viewing ? versionQuery.data : null;
  const currentVersion = data.latestBlueprint?.version ?? null;
  const viewingCurrent = viewing != null && viewing === currentVersion;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) setViewing(null);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" aria-hidden />
          Version history
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"
        aria-describedby={undefined}
      >
        {viewing == null ? (
          <>
            <DialogHeader>
              <DialogTitle>Version history</DialogTitle>
              <DialogDescription>
                Every persisted blueprint version for this project. Older
                versions are view-only.
              </DialogDescription>
            </DialogHeader>
            <ul className="divide-y divide-border">
              {data.versions.length === 0 && (
                <li className="py-6 text-center text-[13px] text-muted-foreground">
                  No blueprint versions yet.
                </li>
              )}
              {data.versions.map((v) => (
                <li key={v.version} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium">Version {v.version}</span>
                      <VersionStatusBadge
                        status={v.status}
                        isCurrent={v.version === currentVersion}
                      />
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground tabular-nums">
                      Created {formatUpdatedAgo(v.createdAt)}
                      {v.approvedAt ? ` · approved ${formatUpdatedAgo(v.approvedAt)}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewing(v.version)}
                  >
                    {v.version === currentVersion ? "View" : "Open"}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2"
                  onClick={() => setViewing(null)}
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
                  Back to versions
                </Button>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base">Version {viewing}</DialogTitle>
                  <VersionStatusBadge status={version?.status ?? ""} isCurrent={viewingCurrent} />
                </div>
              </div>
              <DialogDescription>
                {viewingCurrent
                  ? "This is the current version."
                  : "Viewing an older version — it cannot be modified or approved here."}
              </DialogDescription>
            </DialogHeader>

            {versionQuery.isError && !versionQuery.data ? (
              <div className="py-4">
                <SectionError
                  title="Couldn't load this version"
                  onRetry={() => versionQuery.refetch()}
                />
              </div>
            ) : !version ? (
              <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                Loading version {viewing}…
              </div>
            ) : (
              <div className={cn("pt-2", version.status === "APPROVED" && "border-b-4 border-b-success/40 pb-2")}>
                <BlueprintSections sections={toDisplayVersion(version!).sections} />
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}