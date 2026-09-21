/**
 * Serves a provisioned preview deployment's static HTML from the worker
 * workspace. This is the target of the `deploymentUrl` written by the
 * local-static deployment provider.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { readWorkspaceFile } from "@/server/jobs/workspace";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { deploymentId } = await params;
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { project: { select: { ownerId: true, organizationId: true } } },
  });

  if (!deployment) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (deployment.project.ownerId !== session.user.id) {
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: deployment.project.organizationId,
      },
      select: { id: true },
    });
    if (!membership) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  if (deployment.environment !== "preview" || deployment.status !== "READY") {
    return new NextResponse("Preview is not ready", { status: 409 });
  }

  const metadata =
    deployment.metadataJson && typeof deployment.metadataJson === "object"
      ? (deployment.metadataJson as Record<string, unknown>)
      : {};
  const file = typeof metadata.file === "string" ? metadata.file : null;
  if (!file) {
    return new NextResponse("Preview artifact is not recorded", { status: 409 });
  }

  const html = await readWorkspaceFile(deployment.projectId, file);
  if (html == null) {
    return new NextResponse("Preview artifact was not found on disk", { status: 404 });
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
