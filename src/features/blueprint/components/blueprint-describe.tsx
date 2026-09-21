"use client";

import { useState } from "react";
import { ArrowLeft, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlueprintPipeline } from "./blueprint-pipeline";
import { cn } from "@/lib/utils";

export const EXAMPLE_DESCRIPTION =
  "A platform that helps local restaurants run their daily operations: online ordering, table reservations, delivery scheduling, inventory, and a loyalty program. Owners manage the menu and staff through a dashboard, while customers browse the menu, place orders, and track progress on their phones.";

interface DescribeProps {
  initialDescription: string;
  canEdit: boolean;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (description: string) => void;
  onBack: () => void;
}

/**
 * §1 — The description-input state. Lightweight by design: one prompt, one
 * textarea, one action. Never hints at a fake multi-step wizard.
 */
export function BlueprintDescribe({
  initialDescription,
  canEdit,
  submitting,
  errorMessage,
  onSubmit,
  onBack,
}: DescribeProps) {
  const [value, setValue] = useState(initialDescription);
  const ready = value.trim().length >= 10 && !submitting;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="mb-5 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back
      </button>

      <div className="rounded-lg border border-border bg-card px-6 py-7 sm:px-8">
        <h2 className="text-lg font-semibold tracking-tight">Describe your idea</h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          What are you building, and who is it for? Fleet reads this before it
          runs the analysis — nothing is analyzed until you start.
        </p>

        <label htmlFor="blueprint-description" className="sr-only">
          Product description
        </label>
        <textarea
          id="blueprint-description"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!canEdit || submitting}
          placeholder="e.g. A platform that helps local restaurants run their daily operations…"
          maxLength={2000}
          rows={7}
          className="mt-4 w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-[14px] leading-relaxed text-foreground ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
          <span className={cn(value.trim().length > 0 && value.trim().length < 10 && "text-warning")}>
            {value.trim().length < 10
              ? `Add at least ${10 - value.trim().length} more characters`
              : `${value.trim().length} / 2000 characters`}
          </span>
          <span>Required before analysis</span>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
            {errorMessage}
          </div>
        )}

        {!canEdit && (
          <p className="mt-4 text-[13px] text-muted-foreground">
            You can view this blueprint, but you don&apos;t have permission to
            start an analysis.
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Button
            type="button"
            onClick={() => onSubmit(value.trim())}
            disabled={!ready || !canEdit}
          >
            {submitting ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            )}
            {submitting ? "Starting analysis…" : "Start analysis"}
          </Button>
          <span className="text-[12px] text-muted-foreground">
            No analysis runs until you confirm the description.
          </span>
        </div>

        <div className="mt-7 border-t border-border pt-5">
          <BlueprintPipeline current="analyze" />
        </div>
      </div>
    </div>
  );
}