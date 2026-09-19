"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Blueprint {
  id: string;
  status: string;
  featuresJson: Array<{ name: string; description: string }>;
}

interface Design {
  id: string;
  status: string;
  uiJson: Record<string, unknown>;
  uxJson: Record<string, unknown>;
  architectureJson: Record<string, unknown>;
  databaseJson: Record<string, unknown>;
}

export default function DesignPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setProjectId(p.projectId));
  }, [params]);

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  async function fetchData() {
    try {
      const [blueprintRes, designRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/blueprint`),
        fetch(`/api/projects/${projectId}/design`),
      ]);

      const blueprintData = await blueprintRes.json();
      setBlueprint(blueprintData.data);

      if (designRes.ok) {
        const designData = await designRes.json();
        setDesign(designData.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateDesign() {
    setGenerating(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/design/generate`,
        { method: "POST" }
      );
      if (response.ok) {
        alert("Design generation started!");
      }
    } catch (error) {
      console.error("Error generating design:", error);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (!blueprint || blueprint.status !== "APPROVED") {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📋</div>
        <h2 className="text-lg font-semibold mb-2">
          Blueprint Required
        </h2>
        <p className="text-muted-foreground mb-4">
          You need an approved blueprint before generating the design.
        </p>
        <Link
          href={`/projects/${projectId}/blueprint`}
          className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
        >
          Go to Blueprint
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link
          href={`/projects/${projectId}`}
          className="hover:text-foreground"
        >
          Project
        </Link>
        <span>/</span>
        <span>Design</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Design</h1>
          <p className="text-muted-foreground">
            UI/UX, Architecture, and Database Design
          </p>
        </div>
        {!design && (
          <button
            onClick={handleGenerateDesign}
            disabled={generating}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Design"}
          </button>
        )}
      </div>

      {!design ? (
        <div className="text-center py-12 border rounded-lg">
          <div className="text-4xl mb-4">🎨</div>
          <h2 className="text-lg font-semibold mb-2">No Design Yet</h2>
          <p className="text-muted-foreground mb-4">
            Generate a design based on your approved blueprint.
          </p>
          <button
            onClick={handleGenerateDesign}
            disabled={generating}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Design"}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">UI Design</h3>
            <p className="text-sm text-muted-foreground">
              {Object.keys(design.uiJson).length} components defined
            </p>
            <button className="text-sm text-primary mt-2 hover:underline">
              View Details →
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">UX Flow</h3>
            <p className="text-sm text-muted-foreground">
              {Object.keys(design.uxJson).length} screens mapped
            </p>
            <button className="text-sm text-primary mt-2 hover:underline">
              View Details →
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Architecture</h3>
            <p className="text-sm text-muted-foreground">
              {Object.keys(design.architectureJson).length} services defined
            </p>
            <button className="text-sm text-primary mt-2 hover:underline">
              View Details →
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Database</h3>
            <p className="text-sm text-muted-foreground">
              {Object.keys(design.databaseJson).length} entities defined
            </p>
            <button className="text-sm text-primary mt-2 hover:underline">
              View Details →
            </button>
          </div>
        </div>
      )}

      {design && design.status === "APPROVED" && (
        <div className="mt-6 border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Next Steps</h2>
          <p className="text-muted-foreground mb-4">
            Your design is approved! Ready to start building.
          </p>
          <Link
            href={`/projects/${projectId}/build`}
            className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
          >
            Start Building →
          </Link>
        </div>
      )}
    </div>
  );
}
