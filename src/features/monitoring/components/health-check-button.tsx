"use client";

import { Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * "Check now" — POSTs to the real health-check route for one deployment, then
 * refreshes the server-rendered Health view so the genuine result shows.
 */
export function HealthCheckButton({
  projectId,
  deploymentId,
}: {
  projectId: string;
  deploymentId: string;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={working}
        onClick={async () => {
          setWorking(true);
          setError(null);
          try {
            const res = await fetch(
              `/api/projects/${encodeURIComponent(projectId)}/deploy/${encodeURIComponent(
                deploymentId
              )}/check`,
              { method: "POST" }
            );
            const payload = await res.json().catch(() => null);
            if (!res.ok) {
              setError(
                payload?.error ?? `Health check failed (HTTP ${res.status}).`
              );
            } else {
              router.refresh();
            }
          } catch {
            setError("Health check could not be run right now.");
          } finally {
            setWorking(false);
          }
        }}
      >
        <Activity className={working ? "mr-2 h-3.5 w-3.5 animate-pulse" : "mr-2 h-3.5 w-3.5"} aria-hidden />
        {working ? "Checking…" : "Check now"}
      </Button>
      {error && <span className="text-[12px] text-destructive">{error}</span>}
    </div>
  );
}