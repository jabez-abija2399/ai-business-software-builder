"use client";

import { ExternalLink, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeploymentStatusBadge } from "../../pipeline/components/deployment-status";
import { formatUpdatedAgo } from "../../project-detail/lib/format";
import type { DeployDeployment, DeployEditorData } from "../types";
import { FAILED_DEPLOYMENT, IN_FLIGHT_DEPLOYMENT, READY_DEPLOYMENT } from "../types";

function Environment({
  data,
  environment,
  creating,
  errorMessage,
  onCreate,
}: {
  data: DeployEditorData;
  environment: string;
  creating: boolean;
  errorMessage: string | null;
  onCreate: () => void;
}) {
  const deployments = data.deployments.filter((d) => d.environment === environment);
  const latest: DeployDeployment | null = deployments[deployments.length - 1] ?? null;
  const inflight = latest ? IN_FLIGHT_DEPLOYMENT.has(latest.status) : false;
  const ready = latest ? READY_DEPLOYMENT.has(latest.status) : false;
  const failed = latest ? FAILED_DEPLOYMENT.has(latest.status) : false;

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold tracking-tight capitalize">{environment}</h3>
        {latest ? (
          <DeploymentStatusBadge status={latest.status} />
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            No deployment yet
          </span>
        )}
      </div>

      {latest && (
        <div className="mt-2 space-y-1 text-[12.5px] text-muted-foreground">
          {ready && latest.deploymentUrl ? (
            <a
              href={latest.deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 break-all font-medium text-primary underline-offset-4 hover:underline"
            >
              {latest.deploymentUrl}
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            </a>
          ) : inflight && latest.deploymentUrl ? (
            <a
              href={latest.deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 break-all font-medium text-primary underline-offset-4 hover:underline"
            >
              {latest.deploymentUrl}
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            </a>
          ) : ready ? (
            <p className="font-medium text-warning-foreground">
              The environment reported ready but no URL was provisioned.
            </p>
          ) : inflight ? (
            <p>Deployment in progress. Status updates when the provider finishes building.</p>
          ) : failed ? (
            <div>
              <p className="font-medium text-destructive">
                The last deployment failed and can be retried.
              </p>
              {typeof latest.metadata?.errorMessage === "string" && (
                <p className="mt-1 leading-relaxed text-destructive/90">
                  {latest.metadata.errorMessage}
                </p>
              )}
            </div>
          ) : (
            <p>Last deployment {formatUpdatedAgo(latest.createdAt)}.</p>
          )}
          <p className="tabular-nums">
            {latest.provider} · {formatUpdatedAgo(latest.createdAt)}
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <Button size="sm" disabled={inflight || creating} onClick={onCreate}>
          <Rocket className="mr-2 h-3.5 w-3.5" aria-hidden />
          {creating
            ? "Creating…"
            : latest
              ? inflight
                ? "Deploying…"
                : "Deploy again"
              : `Deploy to ${environment}`}
        </Button>
        {deployments.length > 1 && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {deployments.length - 1} previous deployment{deployments.length === 2 ? "" : "s"}
          </span>
        )}
      </div>

      {errorMessage && <p className="mt-2 text-[12px] text-destructive">{errorMessage}</p>}

      {deployments.length > 1 && (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {deployments
            .slice(0, deployments.length - 1)
            .map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="text-muted-foreground tabular-nums">{formatUpdatedAgo(d.createdAt)}</span>
                <DeploymentStatusBadge status={d.status} />
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export function DeployView({
  data,
  creatingEnv,
  errorMessage,
  onCreate,
}: {
  data: DeployEditorData;
  creatingEnv: "staging" | "production" | null;
  errorMessage: string | null;
  onCreate: (environment: "staging" | "production") => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg font-semibold tracking-tight">Deploy</h2>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground tabular-nums">
          Real deployment records for staging and production
          {data.blueprint ? ` · from blueprint v${data.blueprint.version}` : ""}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Environment
          data={data}
          environment="staging"
          creating={creatingEnv === "staging"}
          errorMessage={creatingEnv === "staging" ? errorMessage : null}
          onCreate={() => onCreate("staging")}
        />
        <Environment
          data={data}
          environment="production"
          creating={creatingEnv === "production"}
          errorMessage={creatingEnv === "production" ? errorMessage : null}
          onCreate={() => onCreate("production")}
        />
      </div>
    </div>
  );
}