"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Preview {
  id: string;
  status: string;
  url: string;
  createdAt: string;
}

export default function PreviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setProjectId(p.projectId));
  }, [params]);

  useEffect(() => {
    if (projectId) {
      fetchPreview();
    }
  }, [projectId]);

  async function fetchPreview() {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/preview`
      );
      if (response.ok) {
        const data = await response.json();
        setPreview(data.data);
        if (data.data?.url) {
          setIframeUrl(data.data.url);
        }
      }
    } catch (error) {
      console.error("Error fetching preview:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePreview() {
    setCreating(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/preview/create`,
        { method: "POST" }
      );
      if (response.ok) {
        const data = await response.json();
        setPreview(data.data);
        if (data.data?.url) {
          setIframeUrl(data.data.url);
        }
      }
    } catch (error) {
      console.error("Error creating preview:", error);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
        <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
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
        <span>Preview</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Preview</h1>
          <p className="text-muted-foreground">
            Test your application in a safe environment
          </p>
        </div>
        {!preview && (
          <button
            onClick={handleCreatePreview}
            disabled={creating}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Preview"}
          </button>
        )}
      </div>

      {!preview ? (
        <div className="text-center py-12 border rounded-lg">
          <div className="text-4xl mb-4">👁️</div>
          <h2 className="text-lg font-semibold mb-2">No Preview Yet</h2>
          <p className="text-muted-foreground mb-4">
            Create a preview to test your application.
          </p>
          <button
            onClick={handleCreatePreview}
            disabled={creating}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Preview"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview Info */}
          <div className="border rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">Preview Environment</div>
              <div className="text-sm text-muted-foreground">
                Created {new Date(preview.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  preview.status === "RUNNING"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {preview.status}
              </span>
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open in new tab →
              </a>
            </div>
          </div>

          {/* Preview Iframe */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted p-2 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 text-center text-sm text-muted-foreground">
                {preview.url}
              </div>
            </div>
            {iframeUrl ? (
              <iframe
                src={iframeUrl}
                className="w-full h-[600px] bg-white"
                title="Application Preview"
              />
            ) : (
              <div className="h-[600px] flex items-center justify-center bg-muted">
                <span className="text-muted-foreground">
                  Loading preview...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {preview && ["PENDING", "BUILDING", "DEPLOYING", "LIVE"].includes(preview.status) && (
        <div className="mt-6 border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Ready to Deploy?</h2>
          <p className="text-muted-foreground mb-4">
            Your preview looks good? Deploy to production!
          </p>
          <Link
            href={`/projects/${projectId}/deploy`}
            className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            Deploy to Production →
          </Link>
        </div>
      )}
    </div>
  );
}
