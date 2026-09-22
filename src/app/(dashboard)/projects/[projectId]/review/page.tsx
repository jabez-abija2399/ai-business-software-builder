import { type Metadata } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getReviewEditorData } from "@/server/db/project-review";
import { reviewEditorKey } from "@/features/review/lib/query-keys";
import { ReviewScreen } from "@/features/review/components/review-screen";

export const metadata: Metadata = {
  title: "Review",
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const queryClient = new QueryClient();
  await queryClient
    .prefetchQuery({
      queryKey: reviewEditorKey(projectId),
      queryFn: async () => {
        const { auth } = await import("@/auth");
        const session = await auth();
        return getReviewEditorData(projectId, session?.user?.id ?? "");
      },
    })
    .catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReviewScreen projectId={projectId} />
    </HydrationBoundary>
  );
}