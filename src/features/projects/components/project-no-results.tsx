"use client";

import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProjectNoResults({
  onClear,
}: {
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed py-16 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <SearchX className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="mt-4 text-[15px] font-medium">No matching projects</h3>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
        No projects match your current search or filters.
      </p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onClear}>
        Clear search & filters
      </Button>
    </div>
  );
}