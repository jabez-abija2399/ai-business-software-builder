"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Blueprint {
  id: string;
  version: number;
  status: string;
  businessContextJson: Record<string, unknown>;
  goalsJson: Array<{ goal: string; priority: string }>;
  personasJson: Array<{ name: string; role: string; description: string }>;
  rolesJson: Array<{ name: string; description: string }>;
  featuresJson: Array<{ name: string; description: string; priority: string }>;
  entitiesJson: Array<{ name: string; description: string }>;
  workflowsJson: Array<{ name: string; description: string }>;
  createdAt: string;
}

export default function BlueprintPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const router = useRouter();
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [businessDescription, setBusinessDescription] = useState("");
  const [constraints, setConstraints] = useState({
    budget: "" as "" | "low" | "medium" | "high",
    timeline: "",
    technicalPreference: "" as "" | "business" | "developer" | "mixed",
  });
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setProjectId(p.projectId));
  }, [params]);

  useEffect(() => {
    if (projectId) {
      fetchBlueprint();
    }
  }, [projectId]);

  async function fetchBlueprint() {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/blueprint`
      );
      const data = await response.json();
      if (data.data) {
        setBlueprint(data.data);
      }
    } catch (error) {
      console.error("Error fetching blueprint:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setAnalyzing(true);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/blueprint/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessDescription,
            constraints: {
              budget: constraints.budget || undefined,
              timeline: constraints.timeline || undefined,
              technicalPreference:
                constraints.technicalPreference || undefined,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // In production, this would start a WebSocket connection
        // For now, we'll poll for updates
        alert(`Analysis started! Job ID: ${data.data.jobId}`);
      }
    } catch (error) {
      console.error("Error starting analysis:", error);
    } finally {
      setAnalyzing(false);
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

  // No blueprint yet - show analyze form
  if (!blueprint) {
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
          <span>Blueprint</span>
        </div>

        <h1 className="text-2xl font-bold mb-6">Business Blueprint</h1>

        <div className="max-w-2xl">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Describe Your Business
            </h2>
            <p className="text-muted-foreground mb-6">
              Tell us about your business problem, goals, and constraints.
              Our AI will analyze your input and create a structured blueprint.
            </p>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Business Description *
                </label>
                <textarea
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Describe your business, the problem you're solving, and your goals..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 10 characters, maximum 2000 characters
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Budget Level
                  </label>
                  <select
                    value={constraints.budget}
                    onChange={(e) =>
                      setConstraints({
                        ...constraints,
                        budget: e.target.value as typeof constraints.budget,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Not specified</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Timeline
                  </label>
                  <input
                    type="text"
                    value={constraints.timeline}
                    onChange={(e) =>
                      setConstraints({
                        ...constraints,
                        timeline: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                    placeholder="e.g., 3 months"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Technical Preference
                  </label>
                  <select
                    value={constraints.technicalPreference}
                    onChange={(e) =>
                      setConstraints({
                        ...constraints,
                        technicalPreference: e.target.value as
                          | ""
                          | "business"
                          | "developer"
                          | "mixed",
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Not specified</option>
                    <option value="business">Business-focused</option>
                    <option value="developer">Developer-focused</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={analyzing || businessDescription.length < 10}
                className="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Analyzing...
                  </span>
                ) : (
                  "Analyze & Create Blueprint"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Blueprint exists - show overview
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
        <span>Blueprint</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Business Blueprint</h1>
          <p className="text-muted-foreground">
            Version {blueprint.version} •{" "}
            <span
              className={`${
                blueprint.status === "APPROVED"
                  ? "text-green-600"
                  : blueprint.status === "REVIEWING"
                  ? "text-yellow-600"
                  : "text-muted-foreground"
              }`}
            >
              {blueprint.status}
            </span>
          </p>
        </div>
        <button className="border px-4 py-2 rounded-md font-medium hover:bg-accent">
          Edit Blueprint
        </button>
      </div>

      {/* Blueprint Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Goals</h3>
          <p className="text-2xl font-bold">{blueprint.goalsJson.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Personas</h3>
          <p className="text-2xl font-bold">
            {blueprint.personasJson.length}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Roles</h3>
          <p className="text-2xl font-bold">{blueprint.rolesJson.length}</p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Features</h3>
          <p className="text-2xl font-bold">
            {blueprint.featuresJson.length}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Entities</h3>
          <p className="text-2xl font-bold">
            {blueprint.entitiesJson.length}
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Workflows</h3>
          <p className="text-2xl font-bold">
            {blueprint.workflowsJson.length}
          </p>
        </div>
      </div>

      {/* Blueprint Details */}
      <div className="mt-6 space-y-4">
        {blueprint.goalsJson.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Goals</h3>
            <ul className="space-y-2">
              {blueprint.goalsJson.map((goal, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      goal.priority === "MUST"
                        ? "bg-red-100 text-red-800"
                        : goal.priority === "SHOULD"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {goal.priority}
                  </span>
                  <span>{goal.goal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {blueprint.featuresJson.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Features</h3>
            <ul className="space-y-2">
              {blueprint.featuresJson.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      feature.priority === "MUST"
                        ? "bg-red-100 text-red-800"
                        : feature.priority === "SHOULD"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {feature.priority}
                  </span>
                  <div>
                    <span className="font-medium">{feature.name}</span>
                    <span className="text-muted-foreground ml-2">
                      {feature.description}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Next Steps */}
      {blueprint.status === "APPROVED" && (
        <div className="mt-6 border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Next Steps</h2>
          <p className="text-muted-foreground mb-4">
            Your blueprint is approved! Ready to generate the design.
          </p>
          <Link
            href={`/projects/${projectId}/design`}
            className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
          >
            Generate Design →
          </Link>
        </div>
      )}
    </div>
  );
}
