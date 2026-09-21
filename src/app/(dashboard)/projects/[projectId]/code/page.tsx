import { type Metadata } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getWorkspaceEditorData } from "@/server/db/project-workspace";
import { codeEditorKey } from "@/features/code/lib/query-keys";
import { CodeScreen } from "@/features/code/components/code-screen";

export const metadata: Metadata = {
  title: "Code",
};

export default async function CodePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const queryClient = new QueryClient();
  await queryClient
    .prefetchQuery({
      queryKey: codeEditorKey(projectId),
      queryFn: async () => {
        const { auth } = await import("@/auth");
        const session = await auth();
        return getWorkspaceEditorData(projectId, session?.user?.id ?? "");
      },
    })
    .catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CodeScreen projectId={projectId} />
    </HydrationBoundary>
  );
}