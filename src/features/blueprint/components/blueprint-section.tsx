"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable collapsible specification block (per A5.5/C13.6). Heading stays
 * visible with its real status; the outline can still see the section.
 */
export function BlueprintSection({
  id,
  title,
  description,
  status,
  defaultOpen,
  children,
}: {
  id: string;
  title: string;
  description: string;
  status: "defined" | "missing";
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? status === "defined");
  const regionId = `section-${id}-content`;

  return (
    <section
      id={id}
      aria-labelledby={`section-${id}-title`}
      className="scroll-mt-24 border-b border-border first:border-t"
    >
      <h3
        id={`section-${id}-title`}
        className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        <span className="first-letter:text-foreground">{title}</span>
      </h3>
      {/* Heading row: title + status + toggle */}
      <div className="flex items-start justify-between gap-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={regionId}
          className="group flex flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/40">
            <span
              className={cn(
                "block h-2 w-2 rounded-full",
                status === "defined" ? "bg-success" : "bg-muted-foreground/50"
              )}
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold tracking-tight">
              {title}
            </span>
            <span className="block text-[12px] text-muted-foreground">
              {description}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              status === "defined"
                ? "bg-success/10 text-success-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {status === "defined" ? "Defined" : "Not specified"}
          </span>
          <span className="text-muted-foreground">
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
              aria-hidden
            />
          </span>
        </div>
      </div>

      {open && (
        <div id={regionId} className="pb-6 pl-0">
          {children}
        </div>
      )}
    </section>
  );
}

/** A single item card inside a section (section → content group → item). */
export function SectionItem({
  title,
  badges = [],
  children,
}: {
  title: string;
  badges?: { label: string; tone?: "default" | "accent" | "success" | "muted" | "warning" }[];
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[14px] font-medium text-foreground">{title}</span>
        {badges.map((b) => (
          <span
            key={b.label}
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
              b.tone === "success" && "bg-success/10 text-success-foreground",
              b.tone === "warning" && "bg-warning/10 text-warning-foreground",
              b.tone === "accent" && "bg-accent text-accent-foreground",
              b.tone === "muted" && "bg-muted text-muted-foreground",
              (!b.tone || b.tone === "default") && "bg-accent text-accent-foreground"
            )}
          >
            {b.label}
          </span>
        ))}
      </div>
      {children && <div className="mt-1.5 space-y-1">{children}</div>}
    </div>
  );
}

export function SectionField({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[13px] leading-relaxed text-muted-foreground">
      <span className="font-medium text-foreground">{label}: </span>
      {value}
    </p>
  );
}

export function SectionItemField({ name, type, required, unique }: { name: string; type: string; required?: boolean; unique?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-2.5 py-1.5 text-[13px]">
      <span className="font-medium text-foreground">{name}</span>
      <span className="flex items-center gap-2">
        <code className="text-[12px] text-muted-foreground">{type}</code>
        {(required || unique) && (
          <span className="text-[11px] text-muted-foreground">
            {required ? "required" : ""}
            {required && unique ? " · " : ""}
            {unique ? "unique" : ""}
          </span>
        )}
      </span>
    </li>
  );
}