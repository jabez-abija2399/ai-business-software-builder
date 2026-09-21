import { type Metadata } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getDesignEditorData } from "@/server/db/project-design";
import { designEditorKey } from "@/features/design/lib/query-keys";
import { DesignScreen } from "@/features/design/components/design-screen";

export const metadata: Metadata = {
  title: "Design",
};

export default async function DesignPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const queryClient = new QueryClient();
  await queryClient
    .prefetchQuery({
      queryKey: designEditorKey(projectId),
      queryFn: async () => {
        const { auth } = await import("@/auth");
        const session = await auth();
        return getDesignEditorData(projectId, session?.user?.id ?? "");
      },
    })
    .catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DesignScreen projectId={projectId} />
    </HydrationBoundary>
  );
}