import prisma from "@/lib/prisma";
import { IN_FLIGHT_RUN_STATUSES, FAILED_RUN_STATUSES } from "@/lib/pipeline";

export type PipelineRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "ERROR"
  | "CANCELLED";

export interface StageEditorProject {
  id: string;
  name: string;
  description: string | null;
  mode: string;
  environment: string;
  /** Owner or org member — the existing access system decides, not the UI. */
  canEdit: boolean;
  /** Project owner only. */
  isOwner: boolean;
}

/**
 * Resolves stage access (owner or org member) exactly like the Blueprint
 * screen does, so gates are enforced server-side and the layout's notFound()
 * keeps working for non-accessible projects.
 */
export async function resolveAccess(
  projectId: string,
  userId: string
): Promise<{ accessible: boolean; canEdit: boolean; isOwner: boolean }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true, organizationId: true },
  });
  if (!project) return { accessible: false, canEdit: false, isOwner: false };

  const isOwner = project.ownerId === userId;
  if (isOwner) return { accessible: true, canEdit: true, isOwner: true };

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: project.organizationId },
    select: { id: true },
  });
  if (!membership) return { accessible: false, canEdit: false, isOwner: false };

  return { accessible: true, canEdit: true, isOwner: false };
}

export { IN_FLIGHT_RUN_STATUSES, FAILED_RUN_STATUSES };