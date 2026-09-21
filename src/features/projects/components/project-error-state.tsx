"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectErrorStateProps {
  onRetry: () => void;
  error?: unknown;
}

export function ProjectErrorState({
  onRetry,
  error,
}: ProjectErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);
  const message =
    error instanceof Error ? error.message : "Something went wrong.";

  return (
    <div className="rounded-xl border py-16 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert className="h-4 w-4 text-destructive" aria-hidden />
      </div>
      <h2 className="mt-4 text-[15px] font-medium">Unable to load projects</h2>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
        Something went wrong while loading your projects.
      </p>

      <div className="mt-5">
        <Button onClick={onRetry}>Try again</Button>
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((current) => !current)}
        aria-expanded={showDetails}
        className="mt-4 text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {showDetails ? "Hide details" : "Show details"}
      </button>

      {showDetails && (
        <pre className="mx-auto mt-3 max-w-md overflow-x-auto rounded-lg border bg-muted p-3 text-left font-mono text-[12px] text-muted-foreground">
          {message}
        </pre>
      )}
    </div>
  );
}