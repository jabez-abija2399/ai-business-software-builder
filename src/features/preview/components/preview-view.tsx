"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink, MonitorPlay } from "lucide-react";
import { BlueprintSection, SectionField } from "../../blueprint/components/blueprint-section";
import { DeploymentStatusBadge } from "../../pipeline/components/deployment-status";
import { formatUpdatedAgo } from "../../project-detail/lib/format";
import type { PreviewDeployment, PreviewEditorData } from "../types";
import { READY_DEPLOYMENT } from "../types";

function DeploymentDetails({ d }: { d: PreviewDeployment }) {
  return (
    <div className="space-y-1.5">
      <SectionField label="Environment" value={d.environment} />
      <SectionField label="Provider" value={d.provider} />
      <SectionField label="Status" value={d.status} />
      <SectionField label="Commit" value={d.commitRef ?? "No commit reference recorded"} />
      <SectionField label="Health" value={d.healthStatus ?? "No health check recorded"} />
      <SectionField
        label="Created"
        value={formatUpdatedAgo(d.createdAt)}
      />
      <SectionField
        label="Completed"
        value={d.completedAt ? formatUpdatedAgo(d.completedAt) : "Not completed yet"}
      />
      <SectionField label="Deployment ID" value={d.id} />
    </div>
  );
}

export function PreviewView({ data }: { data: PreviewEditorData }) {
  const d = data.latestPreview;
  if (!d) return null;
  const ready = READY_DEPLOYMENT.has(d.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight">Preview</h2>
            <DeploymentStatusBadge status={d.status} />
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground tabular-nums">
            Latest preview {formatUpdatedAgo(d.createdAt)}
            {data.blueprint ? ` · from blueprint v${data.blueprint.version}` : ""}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/projects/${data.project.id}/deploy`}>
            Continue to Deploy
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      {ready && d.deploymentUrl ? (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-4">
          <p className="flex items-center gap-2 text-[13px] font-medium text-success-foreground">
            <MonitorPlay className="h-4 w-4 text-success" aria-hidden />
            The preview environment is ready.
          </p>
          <p className="mt-1 break-all text-[12.5px] text-muted-foreground">{d.deploymentUrl}</p>
          <Button asChild size="sm" className="mt-3">
            <a href={d.deploymentUrl} target="_blank" rel="noopener noreferrer">
              Open preview
              <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden />
            </a>
          </Button>
        </div>
      ) : ready ? (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-[13px]">
          <span className="font-medium text-warning-foreground">
            The deployment reported ready but no URL was provisioned.
          </span>{" "}
          <span className="text-muted-foreground">
            Provisioning is not fully configured for this project.
          </span>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground">
          No live preview URL is available yet. The deployment record below shows
          its real status.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-border px-5">
          <BlueprintSection
            id="preview-deployment"
            title="Preview deployment"
            description="Real deployment record for the latest preview"
            status="defined"
            defaultOpen
          >
            <DeploymentDetails d={d} />
          </BlueprintSection>
        </div>

        <div className="rounded-lg border border-border px-5">
          <BlueprintSection
            id="preview-history"
            title="Preview history"
            description="Every preview deployment recorded for this project"
            status={data.previewHistory.length > 1 ? "defined" : "missing"}
          >
            <ul className="space-y-1.5">
              {data.previewHistory.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-2.5 py-1.5 text-[12.5px]"
                >
                  <span className="text-muted-foreground tabular-nums">
                    {formatUpdatedAgo(p.createdAt)}
                  </span>
                  <DeploymentStatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          </BlueprintSection>
        </div>
      </div>
    </div>
  );
}

export { DeploymentDetails };
export type { PreviewDeployment };