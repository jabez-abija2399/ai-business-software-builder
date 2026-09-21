import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  apiCreated,
  apiValidationError,
  apiConflict,
  apiInternalError,
  apiRateLimited,
} from "@/lib/api-response";
import { signupSchema } from "@/validations/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limited = rateLimit(`signup:${ip}`, { limit: 10, windowMs: 60_000 });

    if (!limited.success) {
      return apiRateLimited(limited.retryAfterSeconds);
    }

    const body = await request.json();
    const validationResult = signupSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error.flatten());
    }

    const { name, email, password } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return apiConflict("An account with this email already exists");
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        emailVerified: new Date(),
        passwordHash: hashedPassword,
      },
    });

    // Create account for credentials provider
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: user.id,
      },
    });

    // Create default organization
    const slugBase =
      (name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ??
        "") || `org-${user.id}`;
    const org = await prisma.organization.create({
      data: {
        name: `${name}'s Organization`,
        slug: `${slugBase}-${user.id.slice(0, 8)}`,
      },
    });

    // Add user as owner of organization
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "OWNER",
      },
    });

    return apiCreated({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return apiInternalError();
  }
}
