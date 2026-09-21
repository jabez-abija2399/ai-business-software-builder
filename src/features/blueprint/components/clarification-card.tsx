"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentRunStatus } from "./agent-run-status";
import { useSubmitClarification } from "../hooks/use-blueprint-editor";
import { BlueprintPipeline } from "./blueprint-pipeline";
import { formatUpdatedAgo } from "../../project-detail/lib/format";
import type { BlueprintEditorData } from "../types";

/**
 * Structured clarification checkpoint (A4/B11): one question at a time, the
 * backend's question ID drives submission, and user input survives failures.
 */
export function ClarificationCard({
  projectId,
  data,
  questions,
  onStartAnalysis,
}: {
  projectId: string;
  data: BlueprintEditorData;
  questions: { id: string; question: string }[];
  onStartAnalysis: (description: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [showPrevious, setShowPrevious] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = useSubmitClarification(projectId);

  const question = questions[index];
  const previousAnswers = data.latestBlueprint?.sections.businessContext
    ? data.latestBlueprint.sections.businessContext.clarifications
    : [];
  const clarifications = Array.isArray(previousAnswers)
    ? (previousAnswers as Array<Record<string, unknown>>)
    : [];

  useEffect(() => {
    if (index > questions.length - 1) setIndex(0);
  }, [questions.length, index]);

  // Nothing pending anymore → either all answered or there were none.
  if (questions.length === 0) {
    return allDone ? (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-lg border border-border bg-card px-6 py-8">
          <h2 className="text-base font-semibold tracking-tight">Answers submitted</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Your answers are saved on this blueprint draft. Start a new analysis
            to re-build the blueprint with the added detail.
          </p>
          <Button className="mt-4" onClick={() => {
            const prefill =
              data.latestBlueprint?.rawDescription ?? data.project.description ?? "";
            onStartAnalysis(prefill);
          }}>
            Re-analyze with answers
          </Button>
        </div>
      </div>
    ) : null;
  }

  const error = submit.isError ? (submit.error?.message ?? "Couldn't submit your answer.") : null;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-card px-6 py-7 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              We need one more detail
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              A few details are needed before the blueprint can be finalized.
            </p>
          </div>
          <AgentRunStatus status={data.lastAnalysis?.status ?? "QUEUED"} />
        </div>

        <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-[13px] font-medium text-foreground">{question.question}</p>

          <label htmlFor="clarification-answer" className="sr-only">
            Your answer
          </label>
          <textarea
            id="clarification-answer"
            ref={textareaRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submit.isPending}
            placeholder="Type your answer…"
            rows={4}
            className="mt-3 w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-[14px] leading-relaxed text-foreground ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                const trimmed = answer.trim();
                if (!trimmed) return;
                setAllDone(false);
                submit.mutate(
                  { questionId: question.id, answer: trimmed },
                  {
                    onSuccess: (res) => {
                      setAnswer("");
                      if (res.pending === 0) {
                        setAllDone(true);
                        setIndex(0);
                      }
                    },
                  }
                );
              }}
              disabled={submit.isPending || answer.trim().length === 0}
            >
              {submit.isPending ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Submitting answer…
                </>
              ) : (
                "Submit answer"
              )}
            </Button>
            {questions.length > 1 && (
              <span className="text-[12px] text-muted-foreground">
                Additional information needed
              </span>
            )}
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {error}
              <button
                type="button"
                className="ml-2 font-medium underline underline-offset-2"
                onClick={() => {
                  const trimmed = answer.trim();
                  if (!trimmed) return;
                  submit.mutate(
                    { questionId: question.id, answer: trimmed },
                    {
                      onSuccess: (res) => {
                        setAnswer("");
                        if (res.pending === 0) {
                          setAllDone(true);
                          setIndex(0);
                        }
                      },
                    }
                  );
                }}
              >
                Retry
              </button>
            </div>
          )}
          {submit.isError && (
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              Your answer hasn&apos;t been lost — it stays in the box above.
            </p>
          )}
        </div>

        {clarifications.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowPrevious((s) => !s)}
              aria-expanded={showPrevious}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Previous answers
              {showPrevious ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
            {showPrevious && (
              <ul className="mt-2 space-y-1.5">
                {clarifications.map((c, i) => (
                  <li key={i} className="text-[12.5px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {typeof c.questionId === "string" ? c.questionId : "Answer"}:
                    </span>{" "}
                    {typeof c.answer === "string" ? c.answer : ""}
                    {typeof c.timestamp === "string" && (
                      <span className="ml-2 tabular-nums">· {formatUpdatedAgo(c.timestamp)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-border pt-5">
          <BlueprintPipeline current="analyze" />
        </div>
      </div>
    </div>
  );
}