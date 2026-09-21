"use client";

import type { WorkspaceFile } from "../types";

const TYPE_LABEL: Record<string, string> = {
  SOURCE_FILE: "Source",
  SCHEMA: "Schema",
  TEST: "Test",
  STYLE: "Style",
  DOC: "Docs",
  BUILD_LOG: "Build log",
  QUALITY_REPORT: "Quality report",
};

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "size unknown";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} kB`;
}

/**
 * Shows the real content of a generated file as it exists on the worker
 * workspace, with its persisted metadata. If the file is no longer on disk the
 * screen says exactly that — it never reconstructs or guesses content.
 */
export function CodeFileViewer({ file }: { file: WorkspaceFile }) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <code className="truncate font-mono text-[13px] font-semibold text-foreground">
          {file.filePath}
        </code>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {TYPE_LABEL[file.type] ?? file.type}
        </span>
        <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
          {formatBytes(file.bytes)} · {file.checksum.slice(0, 12)}
        </span>
      </div>

      {file.content === null ? (
        <div className="flex flex-col gap-1 px-5 py-8">
          <p className="text-[13.5px] font-medium text-foreground">
            This file is no longer on disk
          </p>
          <p className="max-w-[38rem] text-[13px] leading-relaxed text-muted-foreground">
            Its metadata was persisted, but the content has been purged from the
            worker workspace. The recorded checksum{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
              {file.checksum}
            </code>{" "}
            can verify any restored copy.
          </p>
        </div>
      ) : (
        <div className="max-h-[65vh] overflow-auto">
          <pre className="p-4 text-[12.5px] leading-relaxed text-foreground/90">
            {file.content}
          </pre>
        </div>
      )}
    </div>
  );
}