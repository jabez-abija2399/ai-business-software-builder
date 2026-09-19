"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  mode: string;
  createdAt: string;
  blueprints: Array<{
    id: string;
    version: number;
    status: string;
  }>;
  _count: {
    requirements: number;
    features: number;
    agentRuns: number;
    deployments: number;
  };
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const pathname = usePathname();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setProjectId(p.projectId));
  }, [params]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  async function fetchProject() {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      setProject(data.data);
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
        <div className="h-32 bg-muted rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">Project not found</h2>
        <Link href="/projects" className="text-primary hover:underline mt-2 block">
          Back to projects
        </Link>
      </div>
    );
  }

  const hasBlueprint = project.blueprints.length > 0;
  const latestBlueprint = project.blueprints[0];

  const navigation = [
    { name: "Overview", href: `/projects/${project.id}` },
    { name: "Blueprint", href: `/projects/${project.id}/blueprint` },
    { name: "Design", href: `/projects/${project.id}/design` },
    { name: "Build", href: `/projects/${project.id}/build` },
    { name: "Quality", href: `/projects/${project.id}/quality` },
    { name: "Preview", href: `/projects/${project.id}/preview` },
    { name: "Deploy", href: `/projects/${project.id}/deploy` },
  ];

  return (
    <div>
      {/* Project Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/projects" className="hover:text-foreground">
            Projects
          </Link>
          <span>/</span>
          <span>{project.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
          <span
            className={`text-sm px-3 py-1 rounded ${
              project.status === "ACTIVE"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {project.status}
          </span>
        </div>
      </div>

      {/* Project Navigation */}
      <nav className="flex gap-1 border-b mb-6 overflow-x-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Project Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Blueprint</div>
          <div className="font-semibold">
            {hasBlueprint ? (
              <span className="text-green-600">
                ✅ v{latestBlueprint.version} ({latestBlueprint.status})
              </span>
            ) : (
              <span className="text-muted-foreground">Not started</span>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Requirements</div>
          <div className="font-semibold">{project._count.requirements}</div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Features</div>
          <div className="font-semibold">{project._count.features}</div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Deployments</div>
          <div className="font-semibold">{project._count.deployments}</div>
        </div>
      </div>

      {/* Recommended Next Step */}
      <div className="border rounded-lg p-6">
        <h2 className="font-semibold mb-4">Recommended Next Step</h2>
        {!hasBlueprint ? (
          <div>
            <p className="text-muted-foreground mb-4">
              Start by creating a Business Blueprint to define your
              application&apos;s requirements.
            </p>
            <Link
              href={`/projects/${project.id}/blueprint`}
              className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
            >
              Start Blueprint →
            </Link>
          </div>
        ) : latestBlueprint.status === "APPROVED" ? (
          <div>
            <p className="text-muted-foreground mb-4">
              Your blueprint is approved! Ready to generate the design.
            </p>
            <Link
              href={`/projects/${project.id}/design`}
              className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
            >
              Generate Design →
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground mb-4">
              Review and approve your blueprint to continue.
            </p>
            <Link
              href={`/projects/${project.id}/blueprint`}
              className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
            >
              Review Blueprint →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
