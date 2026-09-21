import { type Metadata } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getPreviewEditorData } from "@/server/db/project-preview";
import { previewEditorKey } from "@/features/preview/lib/query-keys";
import { PreviewScreen } from "@/features/preview/components/preview-screen";

export const metadata: Metadata = {
  title: "Preview",
};

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const queryClient = new QueryClient();
  await queryClient
    .prefetchQuery({
      queryKey: previewEditorKey(projectId),
      queryFn: async () => {
        const { auth } = await import("@/auth");
        const session = await auth();
        return getPreviewEditorData(projectId, session?.user?.id ?? "");
      },
    })
    .catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PreviewScreen projectId={projectId} />
    </HydrationBoundary>
  );
}