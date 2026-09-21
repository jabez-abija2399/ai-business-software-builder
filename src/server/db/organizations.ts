import prisma from "@/lib/prisma";

export interface PrimaryOrganization {
  organizationId: string;
  role: string;
}

export async function getPrimaryOrganization(
  userId: string
): Promise<PrimaryOrganization | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true, role: true },
    orderBy: { createdAt: "asc" },
  });

  return membership;
}

export async function getPrimaryOrganizationId(
  userId: string
): Promise<string | null> {
  const membership = await getPrimaryOrganization(userId);
  return membership?.organizationId ?? null;
}
