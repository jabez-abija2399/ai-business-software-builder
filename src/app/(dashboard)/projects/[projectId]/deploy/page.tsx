import { type Metadata } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getDeployEditorData } from "@/server/db/project-deploy";
import { deployEditorKey } from "@/features/deploy/lib/query-keys";
import { DeployScreen } from "@/features/deploy/components/deploy-screen";

export const metadata: Metadata = {
  title: "Deploy",
};

export default async function DeployPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const queryClient = new QueryClient();
  await queryClient
    .prefetchQuery({
      queryKey: deployEditorKey(projectId),
      queryFn: async () => {
        const { auth } = await import("@/auth");
        const session = await auth();
        return getDeployEditorData(projectId, session?.user?.id ?? "");
      },
    })
    .catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DeployScreen projectId={projectId} />
    </HydrationBoundary>
  );
}