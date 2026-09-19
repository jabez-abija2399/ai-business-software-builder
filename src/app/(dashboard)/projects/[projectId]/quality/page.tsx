"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface QualityReport {
  overallScore: number;
  tests: {
    passed: number;
    failed: number;
    coverage: number;
  };
  security: {
    score: number;
    vulnerabilities: number;
  };
  accessibility: {
    score: number;
    issues: number;
  };
  performance: {
    score: number;
    lcp: number;
    fid: number;
    cls: number;
  };
}

export default function QualityPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [report, setReport] = useState<QualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setProjectId(p.projectId));
  }, [params]);

  useEffect(() => {
    if (projectId) {
      fetchReport();
    }
  }, [projectId]);

  async function fetchReport() {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/quality/report`
      );
      if (response.ok) {
        const data = await response.json();
        setReport(data.data);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunChecks() {
    setRunning(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/quality/run`,
        { method: "POST" }
      );
      if (response.ok) {
        alert("Quality checks started!");
        fetchReport();
      }
    } catch (error) {
      console.error("Error running checks:", error);
    } finally {
      setRunning(false);
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
        <span>Quality</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quality Checks</h1>
          <p className="text-muted-foreground">
            Tests, security, accessibility, and performance
          </p>
        </div>
        <button
          onClick={handleRunChecks}
          disabled={running}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {running ? "Running..." : "Run Checks"}
        </button>
      </div>

      {!report ? (
        <div className="text-center py-12 border rounded-lg">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-lg font-semibold mb-2">No Report Yet</h2>
          <p className="text-muted-foreground mb-4">
            Run quality checks to see your report.
          </p>
          <button
            onClick={handleRunChecks}
            disabled={running}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {running ? "Running..." : "Run Checks"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="border rounded-lg p-6 text-center">
            <div className="text-5xl font-bold mb-2">
              {report.overallScore}%
            </div>
            <div className="text-muted-foreground">Overall Quality Score</div>
          </div>

          {/* Quality Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Tests</h3>
              <div className="text-2xl font-bold text-green-600">
                {report.tests.passed}
              </div>
              <div className="text-sm text-muted-foreground">
                passed / {report.tests.failed} failed
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Coverage: {report.tests.coverage}%
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Security</h3>
              <div className="text-2xl font-bold">
                {report.security.score}%
              </div>
              <div className="text-sm text-muted-foreground">
                {report.security.vulnerabilities} vulnerabilities
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Accessibility</h3>
              <div className="text-2xl font-bold">
                {report.accessibility.score}%
              </div>
              <div className="text-sm text-muted-foreground">
                {report.accessibility.issues} issues
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Performance</h3>
              <div className="text-2xl font-bold">
                {report.performance.score}%
              </div>
              <div className="text-sm text-muted-foreground">
                LCP: {report.performance.lcp}s | FID: {report.performance.fid}ms
              </div>
            </div>
          </div>
        </div>
      )}

      {report && report.overallScore >= 80 && (
        <div className="mt-6 border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Quality Checks Passed!</h2>
          <p className="text-muted-foreground mb-4">
            Your application meets quality standards. Ready to preview.
          </p>
          <Link
            href={`/projects/${projectId}/preview`}
            className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
          >
            View Preview →
          </Link>
        </div>
      )}
    </div>
  );
}
