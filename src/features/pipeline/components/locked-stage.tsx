"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StageEditorProject } from "../types";

/**
 * Shared gate state shown before a pipeline stage's prerequisite is met —
 * e.g. Design before an approved blueprint. Copies the exact requirement, the
 * current gap, and one path forward. Never invents a fake score or progress.
 */
export function LockedStage({
  project,
  stage,
  requirement,
  gap,
  href,
  cta,
}: {
  project: StageEditorProject;
  stage: string;
  requirement: string;
  gap: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-card px-6 py-8 sm:px-10">
        <div className="flex items-start gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent sm:flex">
            <ShieldCheck className="h-6 w-6 text-foreground/80" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              {stage} is locked until the blueprint is approved
            </h2>
            <p className="mt-2 max-w-[36rem] text-[14px] leading-relaxed text-muted-foreground">
              {requirement} {gap}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Button asChild size="sm">
            <Link href={`/projects/${project.id}${href}`}>
              {cta}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}