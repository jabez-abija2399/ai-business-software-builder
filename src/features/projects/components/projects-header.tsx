"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProjectsHeader({
  onCreate,
}: {
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Manage the applications connected to your AI infrastructure.
        </p>
      </div>
      <Button onClick={onCreate} className="shrink-0">
        <Plus className="mr-1.5 h-4 w-4" aria-hidden />
        Create project
      </Button>
    </div>
  );
}