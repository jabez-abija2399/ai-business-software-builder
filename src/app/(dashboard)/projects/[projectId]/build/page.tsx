import { type Metadata } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getBuildEditorData } from "@/server/db/project-build";
import { buildEditorKey } from "@/features/build/lib/query-keys";
import { BuildScreen } from "@/features/build/components/build-screen";

export const metadata: Metadata = {
  title: "Build",
};

export default async function BuildPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const queryClient = new QueryClient();
  await queryClient
    .prefetchQuery({
      queryKey: buildEditorKey(projectId),
      queryFn: async () => {
        const { auth } = await import("@/auth");
        const session = await auth();
        return getBuildEditorData(projectId, session?.user?.id ?? "");
      },
    })
    .catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BuildScreen projectId={projectId} />
    </HydrationBoundary>
  );
}