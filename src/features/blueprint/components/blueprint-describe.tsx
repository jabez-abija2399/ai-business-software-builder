"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Lightbulb, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlueprintPipeline } from "./blueprint-pipeline";
import { cn } from "@/lib/utils";

export const EXAMPLE_DESCRIPTION =
  "I want to build a platform for local restaurants. Customers can browse a menu, place orders, and track progress on their phones, while owners manage ordering, reservations, delivery, inventory, and a loyalty program through a dashboard.";

const MIN_CHARS = 20;
const MAX_CHARS = 20000;
const COUNT_THRESHOLD = MAX_CHARS - 500;

const EXAMPLES: { category: string; text: string }[] = [
  {
    category: "SaaS platform",
    text: "I want to build a project management platform for small software teams. Teams should create projects, assign tasks, track progress, communicate, and see project activity. Admins manage team members and permissions.",
  },
  {
    category: "Marketplace",
    text: "A marketplace where independent artisans sell handmade goods. Buyers browse by category, review sellers, place orders, and pay online. Sellers manage their shop, listings, inventory, and order fulfillment.",
  },
  {
    category: "Internal business tool",
    text: "An internal expense and approval tool for a mid-size company. Employees submit expenses, managers approve or reject them, and finance exports records for accounting and sees department spending.",
  },
  {
    category: "Education platform",
    text: "An online course platform for a tutoring academy. Teachers create courses and lessons, students enroll and track progress, and admins manage enrollment, invoicing, and certificates of completion.",
  },
];

interface DescribeProps {
  initialDescription: string;
  canEdit: boolean;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (description: string) => void;
  onBack: () => void;
}

/** §2 — Final description-input state. */
export function BlueprintDescribe({
  initialDescription,
  canEdit,
  submitting,
  errorMessage,
  onSubmit,
  onBack,
}: DescribeProps) {
  const [value, setValue] = useState(initialDescription);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [pendingExample, setPendingExample] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = value.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_CHARS;
  const empty = trimmed.length === 0;
  const ready = trimmed.length >= MIN_CHARS && !submitting && canEdit;

  const error =
    empty
      ? "Describe what you want to build before analyzing."
      : tooShort
        ? "Add a little more detail so Fleet can understand what you're building."
        : errorMessage;

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 340)}px`;
  }, []);

  function chooseExample(text: string) {
    if (trimmed.length > 0 && value !== text) {
      setPendingExample(text);
      return;
    }
    setValue(text);
    setExamplesOpen(false);
    setPendingExample(null);
    window.requestAnimationFrame(resize);
  }

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
        <h2 className="text-lg font-semibold tracking-tight">
          Describe what you want to build
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Tell us about your product, who it is for, and what you want users to
          be able to do.
        </p>

        <label
          htmlFor="blueprint-description"
          className="mt-5 block text-[13px] font-medium text-foreground"
        >
          Describe your product
        </label>
        <textarea
          id="blueprint-description"
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ready) {
              e.preventDefault();
              onSubmit(trimmed);
            }
          }}
          disabled={!canEdit || submitting}
          placeholder="Describe your product, the problem it solves, who will use it, and what you want users to be able to do. For example: &quot;I&apos;m building a platform for Ethiopian small businesses to manage inventory, sales, customers, and daily operations…&quot;"
          maxLength={MAX_CHARS}
          rows={9}
          autoFocus={initialDescription.length === 0}
          aria-describedby="blueprint-description-guidance"
          className={cn(
            "mt-1.5 w-full resize-none overflow-y-auto rounded-md border bg-background px-3 py-2.5 text-[14px] leading-relaxed text-foreground ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
            error && "border-destructive/60 focus:ring-destructive/40"
          )}
        />

        <ul
          id="blueprint-description-guidance"
          className="mt-2 list-disc space-y-0.5 pl-5 text-[12px] text-muted-foreground"
        >
          <li>
            You can include: what you&apos;re building, who it&apos;s for, the
            problem it solves, important features, how users should use it.
          </li>
          <li>You don&apos;t need to mention every item — describe your idea naturally.</li>
        </ul>

        <div className="mt-2 flex min-h-[18px] items-center justify-between text-[12px] tabular-nums" aria-live="polite">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : trimmed.length >= COUNT_THRESHOLD ? (
            <span className="text-muted-foreground">
              {trimmed.length.toLocaleString("en-US")} / {MAX_CHARS.toLocaleString("en-US")}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => onSubmit(trimmed)}
            disabled={!ready}
          >
            {submitting ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            )}
            {submitting ? "Analyzing…" : "Analyze my idea"}
            <span aria-hidden className="ml-2">→</span>
          </Button>
          <button
            type="button"
            onClick={() => setExamplesOpen((o) => !o)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            aria-expanded={examplesOpen}
          >
            <Lightbulb className="h-4 w-4" aria-hidden />
            See examples
            {examplesOpen ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
          <span className="hidden text-[11px] text-muted-foreground sm:inline lg:block">
            ⌘ Enter to analyze · description stays private until you start
          </span>
        </div>

        <span className="mt-2 block text-[12px] text-muted-foreground">
          Fleet will analyze your description and identify requirements that need
          clarification.
        </span>

        {examplesOpen && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-[12px] font-medium text-foreground">
              Example prompts
              <span className="ml-2 font-normal text-muted-foreground">
                pick one and tailor it — you can write however feels natural.
              </span>
            </p>
            {pendingExample && value.trim().length > 0 && value !== pendingExample && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-accent bg-accent/30 px-3 py-2 text-[13px]">
                <span className="text-foreground">
                  Replace your current description with this example?
                </span>
                <span className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setValue(pendingExample);
                      setPendingExample(null);
                      setExamplesOpen(false);
                      window.requestAnimationFrame(resize);
                    }}
                    className="rounded-md bg-primary px-2.5 py-1 text-[12px] font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingExample(null)}
                    className="rounded-md border border-border px-2.5 py-1 text-[12px] font-medium hover:bg-accent"
                  >
                    Keep mine
                  </button>
                </span>
              </div>
            )}
            <ul className="mt-3 space-y-2">
              {EXAMPLES.map((ex) => (
                <li key={ex.category}>
                  <button
                    type="button"
                    onClick={() => chooseExample(ex.text)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="block text-[13px] font-semibold text-foreground">
                      {ex.category}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-muted-foreground">
                      &quot;{ex.text}&quot;
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!canEdit && (
          <p className="mt-4 text-[13px] text-muted-foreground">
            You can view this blueprint, but you don&apos;t have permission to
            start an analysis.
          </p>
        )}

        <div className="mt-6 border-t border-border pt-5">
          <BlueprintPipeline current="analyze" />
        </div>
      </div>
    </div>
  );
}