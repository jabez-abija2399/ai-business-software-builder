import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  QueryClient,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { auth } from "@/auth";
import { getPrimaryOrganizationId } from "@/server/db/organizations";
import { listProjects } from "@/server/db/projects";
import { parseListSearchParams } from "@/features/projects/lib/parse-search-params";
import { projectsQueryKey } from "@/features/projects/lib/query-key";
import { ProjectsPage } from "@/features/projects/components/projects-page";
import { ProjectListSkeleton } from "@/features/projects/components/project-skeleton";
import type { ProjectListResponse } from "@/features/projects/types";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, rawParams] = await Promise.all([auth(), searchParams]);
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const params = parseListSearchParams(rawParams);
  const queryClient = new QueryClient();
  const organizationId = await getPrimaryOrganizationId(session.user.id);

  // Prefetch the first page server-side so the first paint is instant and the
  // client hydrates from the cache instead of showing a loading skeleton.
  if (organizationId) {
    await queryClient.prefetchInfiniteQuery({
      queryKey: projectsQueryKey(params),
      queryFn: async () => listProjects(organizationId, params),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage: ProjectListResponse) =>
        lastPage.nextCursor ?? undefined,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectsPage />
      </Suspense>
    </HydrationBoundary>
  );
}