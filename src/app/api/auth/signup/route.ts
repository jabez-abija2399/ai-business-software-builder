import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  apiCreated,
  apiValidationError,
  apiConflict,
  apiInternalError,
} from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validate input
    if (!email || !password) {
      return apiValidationError("Email and password are required");
    }

    if (password.length < 8) {
      return apiValidationError("Password must be at least 8 characters");
    }

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
    const org = await prisma.organization.create({
      data: {
        name: `${name}'s Organization`,
        slug: name?.toLowerCase().replace(/\s+/g, "-") || `org-${user.id.slice(0, 8)}`,
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
