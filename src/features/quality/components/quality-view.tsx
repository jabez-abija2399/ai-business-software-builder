"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { BlueprintSection } from "../../blueprint/components/blueprint-section";
import { formatMilliseconds, formatUpdatedAgo } from "../../project-detail/lib/format";
import { summarizeQuality, qualityTaskLabel, type QualityEditorData, type QualityTestRecord } from "../types";

const STATUS_TONE: Record<string, string> = {
  PASSED: "bg-success/10 text-success-foreground",
  FAILED: "bg-destructive/10 text-destructive",
  SKIPPED: "bg-muted text-muted-foreground",
  PENDING: "bg-muted text-muted-foreground",
};

function TestStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${
        STATUS_TONE[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

function TestRecordList({ records }: { records: QualityTestRecord[] }) {
  if (records.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No test records have been persisted yet.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {records.map((r) => (
        <li key={r.id} className="rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-medium text-foreground">{r.name}</span>
              <span className="block text-[11.5px] text-muted-foreground">
                {qualityTaskLabel(r.testType)}
                {r.durationMs != null ? ` · ${formatMilliseconds(r.durationMs)}` : ""}
                {r.completedAt ? ` · ${formatUpdatedAgo(r.completedAt)}` : ""}
              </span>
            </span>
            <TestStatusBadge status={r.status} />
          </div>
          {r.errorMessage && (
            <p className="mt-1 text-[11.5px] text-destructive">{r.errorMessage}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function QualityView({ data }: { data: QualityEditorData }) {
  const summary = summarizeQuality(data.testRecords);
  const hasFailures = summary.failed > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight">Quality</h2>
            <Badge variant={hasFailures ? "warning" : "success"} className="font-normal normal-case">
              {summary.total === 0
                ? "No results yet"
                : `${summary.passed} passed · ${summary.failed} failed`}
            </Badge>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground tabular-nums">
            Derived from {summary.total} real test record{summary.total === 1 ? "" : "s"}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.byType.map((t) => (
          <div key={t.testType} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t.label}
            </p>
            {t.total === 0 ? (
              <p className="mt-1.5 text-[13px] text-muted-foreground">No results yet</p>
            ) : (
              <p className="mt-1.5 text-[13px] tabular-nums">
                <span className="font-medium text-success">{t.passed} passed</span>
                <span className="text-muted-foreground"> · </span>
                <span className={t.failed > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
                  {t.failed} failed
                </span>
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border px-5">
        <BlueprintSection
          id="test-records"
          title="Test records"
          description="Every check Fleet ran, with its real result"
          status={data.testRecords.length > 0 ? "defined" : "missing"}
          defaultOpen
        >
          <TestRecordList records={data.testRecords} />
        </BlueprintSection>
      </div>
    </div>
  );
}