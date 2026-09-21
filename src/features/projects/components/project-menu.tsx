"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ExternalLink,
  KeyRound,
  MoreHorizontal,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteProject } from "../hooks/use-project-mutations";
import type { ProjectListItem } from "../types";

export function ProjectMenu({ project }: { project: ProjectListItem }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteProject = useDeleteProject();

  function handleDelete() {
    deleteProject.mutate({ id: project.id, name: project.name });
    setConfirmOpen(false);
  }

  const baseHref = `/projects/${project.id}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${project.name}`}
            className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={baseHref}>
              <ExternalLink aria-hidden />
              Open project
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${baseHref}#settings`}>
              <Settings aria-hidden />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${baseHref}#api-keys`}>
              <KeyRound aria-hidden />
              API keys
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${baseHref}#usage`}>
              <BarChart3 aria-hidden />
              Usage
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${baseHref}#members`}>
              <Users aria-hidden />
              Members
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setConfirmOpen(true)}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 aria-hidden />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{project.name}</span>{" "}
              will be archived and removed from your list. This action can be
              reversed by re-activating the project.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? "Deleting…" : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}