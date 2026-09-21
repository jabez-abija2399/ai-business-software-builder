"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Copy,
  MoreHorizontal,
  Settings,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROJECT_ENVIRONMENT_META } from "@/features/projects/lib/project-meta";
import { getPrimaryAction, serializeShellLifecycle } from "../lib/actions";
import type { ProjectShellData } from "../lib/shell";

const NAV_ITEMS = [
  { name: "Overview", href: "", end: true },
  { name: "Blueprint", href: "/blueprint", end: false },
  { name: "Design", href: "/design", end: false },
  { name: "Build", href: "/build", end: false },
  { name: "Quality", href: "/quality", end: false },
  { name: "Code", href: "/code", end: false },
  { name: "Preview", href: "/preview", end: false },
  { name: "Deploy", href: "/deploy", end: false },
] as const;

function CopyProjectId({ projectId }: { projectId: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(projectId).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy project ID"
      title="Copy project ID"
      className="group inline-flex items-center gap-1 rounded px-1 font-mono text-[12px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="max-w-[9rem] truncate">prj_{projectId.slice(0, 12)}</span>
      {copied ? (
        <Check className="h-3 w-3 text-success" aria-hidden />
      ) : (
        <Copy
          className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-hidden
        />
      )}
    </button>
  );
}

function OverflowMenu({ project }: { project: ProjectShellData }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  function copyId() {
    navigator.clipboard.writeText(project.id);
    toast({ title: "Project ID copied" });
  }

  async function deleteProject() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Project archived", description: `${project.name} has been archived.` });
      router.push("/projects");
    } catch {
      toast({ title: "Could not delete project", variant: "destructive" });
      setDeleting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Project actions">
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Project actions</DropdownMenuLabel>
          <DropdownMenuItem onSelect={copyId}>
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            Copy project ID
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" aria-hidden />
              Account settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {project.name}?</DialogTitle>
            <DialogDescription>
              This archives the project, its builds, and its deployments. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteProject} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ProjectDetailShell({
  project,
  children,
}: {
  project: ProjectShellData;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const lifecycle = serializeShellLifecycle(project);
  const primaryAction = getPrimaryAction(project.id, lifecycle);
  const env = PROJECT_ENVIRONMENT_META[project.environment];
  const base = `/projects/${project.id}`;

  return (
    <div className="space-y-6">
      <div>
        {/* Breadcrumb */}
        <nav className="mb-3" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <li>
              <Link href="/projects" className="transition-colors hover:text-foreground">
                Projects
              </Link>
            </li>
            <li aria-hidden>
              <span className="text-muted-foreground/60">/</span>
            </li>
            <li aria-current="page" className="truncate text-foreground/90">
              {project.name}
            </li>
          </ol>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                {project.name}
              </h1>
              <Badge
                variant="outline"
                className="gap-1.5 border-border font-normal normal-case"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    project.environment === "PRODUCTION" ? "bg-success" : "bg-info"
                  }`}
                  aria-hidden
                />
                {env.label}
              </Badge>
              {project.isArchived && (
                <Badge variant="destructive" className="font-normal normal-case">
                  Archived
                </Badge>
              )}
            </div>
            {project.description && (
              <p className="mt-1 max-w-[38rem] text-[13px] text-muted-foreground">
                {project.description}
              </p>
            )}
            <div className="mt-1.5">
              <CopyProjectId projectId={project.id} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button asChild>
              <Link href={primaryAction.href}>
                {primaryAction.label}
                <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <OverflowMenu project={project} />
          </div>
        </div>
      </div>

      {/* Project-scoped navigation */}
      <nav
        aria-label="Project sections"
        className="-mx-4 overflow-x-auto border-b border-border scrollbar-thin sm:mx-0"
      >
        <div className="flex min-w-max gap-1 px-4 sm:px-0">
          {NAV_ITEMS.map((item) => {
            const href = item.end ? base : `${base}${item.href}`;
            const active = item.end
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.name}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative -mb-px inline-flex items-center whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {children}
    </div>
  );
}