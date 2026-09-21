"use client";

import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CodeEmpty({ projectId }: { projectId: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-card px-6 py-8 sm:px-10">
        <div className="flex items-start gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent sm:flex">
            <FolderOpen className="h-6 w-6 text-foreground/80" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Nothing generated yet</h2>
            <p className="mt-2 max-w-[36rem] text-[14px] leading-relaxed text-muted-foreground">
              This project has an approved blueprint but the workspace is empty.
              Start the build and the worker will generate real files here.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Button asChild size="sm">
            <Link href={`/projects/${projectId}/build`}>
              Go to build
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}