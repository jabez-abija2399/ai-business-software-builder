import { type Metadata } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getQualityEditorData } from "@/server/db/project-quality";
import { qualityEditorKey } from "@/features/quality/lib/query-keys";
import { QualityScreen } from "@/features/quality/components/quality-screen";

export const metadata: Metadata = {
  title: "Quality",
};

export default async function QualityPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const queryClient = new QueryClient();
  await queryClient
    .prefetchQuery({
      queryKey: qualityEditorKey(projectId),
      queryFn: async () => {
        const { auth } = await import("@/auth");
        const session = await auth();
        return getQualityEditorData(projectId, session?.user?.id ?? "");
      },
    })
    .catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <QualityScreen projectId={projectId} />
    </HydrationBoundary>
  );
}