import { type Metadata } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getBlueprintEditorData } from "@/server/db/project-blueprints";
import { blueprintEditorKey } from "@/features/blueprint/lib/query-keys";
import { BlueprintScreen } from "@/features/blueprint/components/blueprint-screen";

export const metadata: Metadata = {
  title: "Blueprint",
};

export default async function BlueprintPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const queryClient = new QueryClient();
  await queryClient
    .prefetchQuery({
      queryKey: blueprintEditorKey(projectId),
      queryFn: async () => {
        // The layout already resolved access; reuse the session's editor data.
        const { auth } = await import("@/auth");
        const session = await auth();
        return getBlueprintEditorData(projectId, session?.user?.id ?? "");
      },
    })
    .catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BlueprintScreen projectId={projectId} />
    </HydrationBoundary>
  );
}