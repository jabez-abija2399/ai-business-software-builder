import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAccessibleProject } from "@/server/db/project-overview";
import { serializeProjectShell } from "@/features/project-detail/lib/shell";
import { ProjectDetailShell } from "@/features/project-detail/components/project-detail-shell";

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ projectId: string }>;
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const { projectId } = await params;
  const accessible = await getAccessibleProject(projectId, session.user.id);
  if (!accessible) {
    notFound();
  }

  return (
    <ProjectDetailShell project={serializeProjectShell(accessible)}>
      {children}
    </ProjectDetailShell>
  );
}