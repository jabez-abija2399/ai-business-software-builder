"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { BlueprintSection, SectionItem, SectionField } from "../../blueprint/components/blueprint-section";
import type { DesignEditorData } from "../types";
import { formatUpdatedAgo } from "../../project-detail/lib/format";

function itemLabel(item: Record<string, unknown>, key: string, fallback: string): string {
  const value = item[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringOrNotSpecified(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "Not specified";
}

function DesignView({
  data,
}: {
  data: DesignEditorData;
}) {
  const d = data.latestDesign;
  if (!d) return null;

  const tokens: ReactNode =
    d.tokens && Object.keys(d.tokens).length > 0 ? (
      <dl className="grid gap-2 sm:grid-cols-2">
        {Object.entries(d.tokens).map(([key, value]) => (
          <div key={key} className="rounded-md bg-muted/40 px-2.5 py-1.5 text-[13px]">
            <dt className="font-medium text-foreground">{key}</dt>
            <dd className="text-muted-foreground">{stringOrNotSpecified(value)}</dd>
          </div>
        ))}
      </dl>
    ) : null;

  const components = d.components.length > 0
    ? d.components.map((c, i) => (
        <SectionItem key={i} title={itemLabel(c, "name", "Component")}>
          <SectionField label="Description" value={itemLabel(c, "description", "No information provided yet.")} />
          {typeof c.props === "object" && c.props !== null && (
            <div className="space-y-1">
              {Object.entries(c.props as Record<string, unknown>).map(([key, value]) => (
                <SectionField key={key} label={key} value={stringOrNotSpecified(value)} />
              ))}
            </div>
          )}
        </SectionItem>
      ))
    : null;

  const pages = d.pages.length > 0
    ? d.pages.map((p, i) => (
        <SectionItem key={i} title={itemLabel(p, "title", "Page")}>
          <SectionField label="Path" value={itemLabel(p, "path", "No information provided yet.")} />
          <SectionField label="Description" value={itemLabel(p, "description", "No information provided yet.")} />
        </SectionItem>
      ))
    : null;

  const states = d.states.length > 0
    ? d.states.map((s, i) => (
        <SectionItem key={i} title={itemLabel(s, "name", "State")}>
          <SectionField label="Description" value={itemLabel(s, "description", "No information provided yet.")} />
        </SectionItem>
      ))
    : null;

  const responsive = d.responsiveRules.length > 0
    ? d.responsiveRules.map((r, i) => (
        <SectionItem key={i} title={itemLabel(r, "name", "Responsive rule")}>
          <SectionField label="Rule" value={itemLabel(r, "rule", "No information provided yet.")} />
        </SectionItem>
      ))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight">Design</h2>
            <Badge variant="outline" className="font-normal normal-case">
              Version {d.version}
            </Badge>
            <Badge variant={d.status === "APPROVED" ? "success" : d.status === "DRAFT" ? "warning" : "secondary"} className="font-normal normal-case">
              {d.status}
            </Badge>
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground tabular-nums">
            Generated {formatUpdatedAgo(data.designVersions[0]?.createdAt ?? d.id)}
            {data.blueprint ? ` · from blueprint v${data.blueprint.version}` : ""}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/projects/${data.project.id}/build`}>
            Continue to Build
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border px-5">
        <BlueprintSection id="tokens" title="Design tokens" description="Colors, spacing, typography and other design constants" status={tokens ? "defined" : "missing"}>
          {tokens ?? <p className="text-[13px] text-muted-foreground">No design tokens have been produced yet.</p>}
        </BlueprintSection>
        <BlueprintSection id="components" title="Components" description="Reusable UI components defined for the product" status={components ? "defined" : "missing"}>
          {components ?? <p className="text-[13px] text-muted-foreground">No components have been produced yet.</p>}
        </BlueprintSection>
        <BlueprintSection id="pages" title="Pages" description="Screens and their routes" status={pages ? "defined" : "missing"}>
          {pages ?? <p className="text-[13px] text-muted-foreground">No pages have been produced yet.</p>}
        </BlueprintSection>
        <BlueprintSection id="states" title="User flows & states" description="Interaction states and transitions" status={states ? "defined" : "missing"}>
          {states ?? <p className="text-[13px] text-muted-foreground">No user flows have been produced yet.</p>}
        </BlueprintSection>
        <BlueprintSection id="responsive" title="Responsive rules" description="Behavior across breakpoints" status={responsive ? "defined" : "missing"}>
          {responsive ?? <p className="text-[13px] text-muted-foreground">No responsive rules have been produced yet.</p>}
        </BlueprintSection>
      </div>
    </div>
  );
}

export { DesignView };