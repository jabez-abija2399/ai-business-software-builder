"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { BlueprintSection } from "../../blueprint/components/blueprint-section";
import { formatUpdatedAgo } from "../../project-detail/lib/format";
import { summarizeReview, type ReviewEditorData } from "../types";

function findBadge(data: ReviewEditorData): { label: string; tone: "success" | "warning" | "secondary" } {
  const summary = summarizeReview(data);
  if (summary.errors > 0) return { label: `${summary.errors} error${summary.errors === 1 ? "" : "s"} found`, tone: "warning" };
  if (summary.warnings > 0) return { label: `${summary.warnings} warning${summary.warnings === 1 ? "" : "s"}`, tone: "warning" };
  if (summary.findings > 0) return { label: `${summary.findings} finding${summary.findings === 1 ? "" : "s"}`, tone: "secondary" };
  return { label: "No findings", tone: "success" };
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function ArtifactBlock({
  title,
  description,
  filePath,
  content,
  updatedAgo,
}: {
  title: string;
  description: string;
  filePath: string;
  content: string;
  updatedAgo: string;
}) {
  return (
    <div className="rounded-lg border border-border px-5">
      <BlueprintSection
        id={title.toLowerCase().replace(/\s+/g, "-")}
        title={title}
        description={description}
        status={content ? "defined" : "missing"}
        defaultOpen
      >
        {content ? (
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-4 font-mono text-[12px] leading-relaxed text-foreground">
            {content}
          </pre>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            The artifact was written but its content could not be read back (file missing or empty).
          </p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          <span className="font-mono">{filePath}</span> · written {updatedAgo}
        </p>
      </BlueprintSection>
    </div>
  );
}

export function ReviewView({ data }: { data: ReviewEditorData }) {
  const badge = findBadge(data);
  const readme = data.artifacts.find((a) => a.type === "README");
  const report = data.artifacts.find((a) => a.type === "REVIEW_REPORT");
  const summary = summarizeReview(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight">Review</h2>
            <Badge variant={badge.tone} className="font-normal normal-case">
              {badge.label}
            </Badge>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground tabular-nums">
            {data.artifacts.length} real artifact{data.artifacts.length === 1 ? "" : "s"}
            {data.blueprint ? ` · from blueprint v${data.blueprint.version}` : ""}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/projects/${data.project.id}/preview`}>
            Continue to Preview
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Files" value={String(summary.files)} />
        <SummaryCard label="Components" value={String(summary.components)} />
        <SummaryCard label="Pages" value={String(summary.pages)} />
        <SummaryCard label="Findings" value={String(summary.findings)} />
        <SummaryCard label="Errors" value={String(summary.errors)} />
      </div>

      {readme && (
        <ArtifactBlock
          title="README"
          description="Written from the real generated files"
          filePath={readme.filePath}
          content={readme.content}
          updatedAgo={formatUpdatedAgo(readme.createdAt)}
        />
      )}

      {report && (
        <ArtifactBlock
          title="Agent review report"
          description="Findings from scanning the real files"
          filePath={report.filePath}
          content={report.content}
          updatedAgo={formatUpdatedAgo(report.createdAt)}
        />
      )}

      {!readme && !report && (
        <p className="text-[13px] text-muted-foreground">No artifacts have been persisted yet.</p>
      )}
    </div>
  );
}