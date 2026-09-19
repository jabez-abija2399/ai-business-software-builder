"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Deployment {
  id: string;
  status: string;
  environment: string;
  url: string | null;
  createdAt: string;
}

export default function DeployPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState("production");
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setProjectId(p.projectId));
  }, [params]);

  useEffect(() => {
    if (projectId) {
      fetchDeployments();
    }
  }, [projectId]);

  async function fetchDeployments() {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/deployments`
      );
      if (response.ok) {
        const data = await response.json();
        setDeployments(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching deployments:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeploy() {
    setDeploying(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/deployments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ environment: selectedEnv }),
        }
      );
      if (response.ok) {
        alert("Deployment started!");
        fetchDeployments();
      }
    } catch (error) {
      console.error("Error deploying:", error);
    } finally {
      setDeploying(false);
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
        <span>Deploy</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Deploy</h1>
          <p className="text-muted-foreground">
            Deploy your application to production
          </p>
        </div>
      </div>

      {/* Deploy Form */}
      <div className="border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">New Deployment</h2>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              Environment
            </label>
            <select
              value={selectedEnv}
              onChange={(e) => setSelectedEnv(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
            >
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {deploying ? "Deploying..." : "Deploy"}
          </button>
        </div>
      </div>

      {/* Deployment History */}
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Deployment History</h3>
        </div>
        {deployments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No deployments yet
          </div>
        ) : (
          <div className="divide-y">
            {deployments.map((deployment) => (
              <div key={deployment.id} className="p-4 flex items-center gap-4">
                <span
                  className={`text-xl ${
                    deployment.status === "SUCCESS"
                      ? "text-green-600"
                      : deployment.status === "FAILED"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {deployment.status === "SUCCESS"
                    ? "✅"
                    : deployment.status === "FAILED"
                    ? "❌"
                    : "⏳"}
                </span>
                <div className="flex-1">
                  <div className="font-medium">
                    {deployment.environment}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(deployment.createdAt).toLocaleString()}
                  </div>
                </div>
                {deployment.url && (
                  <a
                    href={deployment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Visit Site →
                  </a>
                )}
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    deployment.status === "SUCCESS"
                      ? "bg-green-100 text-green-800"
                      : deployment.status === "FAILED"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {deployment.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
