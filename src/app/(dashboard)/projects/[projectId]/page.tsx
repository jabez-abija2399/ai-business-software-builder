import { type Metadata } from "next";
import { Suspense } from "react";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { overviewQuerySchema } from "@/validations/overview";
import { getProjectOverviewStats } from "@/server/db/project-overview";
import { getProjectActivity } from "@/server/db/project-activity";
import { projectActivityKey, projectOverviewKey } from "@/features/project-detail/lib/shell";
import { type OverviewRange } from "@/features/project-detail/types";
import { ProjectOverview } from "@/features/project-detail/components/project-overview";
import { ProjectOverviewSkeleton } from "@/features/project-detail/components/project-overview-skeleton";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function ProjectOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const { projectId } = await params;
  const raw = await searchParams;
  const rawRange = Array.isArray(raw.range) ? raw.range[0] : raw.range;
  const parsed = overviewQuerySchema.safeParse({ range: rawRange });
  const range: OverviewRange = parsed.success ? parsed.data.range : "7d";

  // Server prefetch with graceful degradation: if one side fails the client
  // still hydrates the rest and shows an inline retry for that section (spec §41–§43).
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: projectOverviewKey(projectId, range),
      queryFn: () => getProjectOverviewStats(projectId, range),
    }).catch(() => undefined),
    queryClient.prefetchQuery({
      queryKey: projectActivityKey(projectId),
      queryFn: () => getProjectActivity(projectId),
    }).catch(() => undefined),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<ProjectOverviewSkeleton />}>
        <ProjectOverview projectId={projectId} initialRange={range} />
      </Suspense>
    </HydrationBoundary>
  );
}