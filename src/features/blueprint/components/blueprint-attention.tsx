import { AlertTriangle, GitBranch } from "lucide-react";
import type { BlueprintEditorData } from "../types";

/**
 * Real Decision / KnownIssue records surfaced contextually (C17).
 * Renders nothing when neither exists — no empty warning panels.
 */
export function BlueprintAttention({ data }: { data: BlueprintEditorData }) {
  const decisions = data.decisions;
  const issues = data.knownIssues;

  if (decisions.length === 0 && issues.length === 0) return null;

  return (
    <div className="space-y-3">
      {issues.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden />
            Known issues ({issues.length})
          </h4>
          <ul className="space-y-1.5">
            {issues.map((i) => (
              <li
                key={i.id}
                className="rounded-md border border-warning/30 bg-warning/5 px-2.5 py-2 text-[12.5px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground">{i.title}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-warning">
                    {i.severity ? `${i.severity} · ` : ""}
                    {i.status}
                  </span>
                </div>
                {i.description ? (
                  <p className="mt-0.5 text-muted-foreground">{i.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {decisions.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5 text-info" aria-hidden />
            Decisions pending ({decisions.length})
          </h4>
          <ul className="space-y-1.5">
            {decisions.map((d) => (
              <li key={d.id} className="rounded-md border border-border bg-muted/40 px-2.5 py-2 text-[12.5px]">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground">{d.title}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {d.status}
                  </span>
                </div>
                {d.decision ? <p className="mt-0.5 text-muted-foreground">{d.decision}</p> : null}
                {!d.decision && d.context ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{d.context}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}