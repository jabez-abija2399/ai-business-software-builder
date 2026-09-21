import Link from "next/link";
import { ArrowRight, PenLine, Rocket, ShieldCheck, Wrench } from "lucide-react";
import type { Lifecycle, ProjectOverviewProject } from "../types";

const STEPS = [
  {
    icon: PenLine,
    title: "1  Create your blueprint",
    description: "Define requirements and business rules for the platform to follow.",
    href: "/blueprint",
    cta: "Start blueprint",
  },
  {
    icon: Wrench,
    title: "2  Build your application",
    description: "Generate the application code with the AI build pipeline.",
    href: "/build",
    cta: "Start build",
  },
  {
    icon: ShieldCheck,
    title: "3  Run quality checks",
    description: "Verify tests, security, accessibility and performance.",
    href: "/quality",
    cta: "Run quality checks",
  },
  {
    icon: Rocket,
    title: "4  Deploy to an environment",
    description: "Deploy a live environment and open the preview.",
    href: "/deploy",
    cta: "Deploy",
  },
] as const;

function bossNext({ projectId, lifecycle }: { projectId: string; lifecycle: Lifecycle }) {
  if (!lifecycle.hasBlueprint) return { label: "Start blueprint", href: `blueprint` };
  if (lifecycle.blueprintStatus !== "APPROVED") return { label: "Review blueprint", href: `blueprint` };
  if (!lifecycle.hasRuns) return { label: "Start build", href: `build` };
  return { label: "Deploy project", href: `deploy` };
}

/**
 * Onboarding shown instead of the analytics grid before a project has any
 * activity (Overview spec §10–§11, §26). Never shows fake zeros — it explains
 * exactly what remains and what to do next.
 */
export function ProjectOnboarding({
  project,
  lifecycle,
}: {
  project: ProjectOverviewProject;
  lifecycle: Lifecycle;
}) {
  const next = bossNext({ projectId: project.id, lifecycle });
  const needsSetup = !lifecycle.hasBlueprint;

  if (!needsSetup && lifecycle.hasRuns) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold tracking-tight">
          {needsSetup
            ? "Connect your first AI build"
            : "Your project is ready"}
        </h2>
        <p className="mt-1 max-w-[38rem] text-[13px] text-muted-foreground">
          {needsSetup
            ? "Choose a starting point and begin generating your application. No data to show yet — setup is the first step."
            : "Blueprint is ready. Start the build to generate your application, then deploy it."}
        </p>
      </div>

      <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto]">
        <ol className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, i) => {
            const pending = needsSetup ? i !== 0 : i < 2;
            const disabled = pending && !lifecycle.hasBlueprint && i !== 0;
            const Icon = step.icon;
            const href = `/projects/${project.id}${step.href}`;
            return (
              <li
                key={step.title}
                className="flex gap-3 rounded-lg border border-border/70 bg-muted/30 p-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{step.title}</div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {step.description}
                  </p>
                  <Link
                    href={href}
                    tabIndex={disabled ? -1 : 0}
                    aria-disabled={disabled}
                    className={`mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      disabled ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    {step.cta}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col justify-center gap-2 lg:w-64">
          <Link
            href={`/projects/${project.id}/${next.href}`}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {next.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="text-center text-[11px] text-muted-foreground">
            Your progress is shown below.
          </p>
        </div>
      </div>
    </div>
  );
}