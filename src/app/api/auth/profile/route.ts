import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { apiSuccess, apiUnauthorized, apiValidationError, apiNotFound, apiNoContent, apiInternalError } from "@/lib/api-response";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .trim()
    .optional(),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .toLowerCase()
    .optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error.flatten());
    }

    const { name, email } = validationResult.data;

    if (!name && !email) {
      return apiValidationError("At least one field must be provided");
    }

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: session.user.id },
        },
      });

      if (existingUser) {
        return apiValidationError("Email is already in use");
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true,
      },
    });

    return apiSuccess(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return apiInternalError();
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return apiNoContent();
  } catch (error) {
    console.error("Error deleting account:", error);
    return apiInternalError();
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return apiNotFound("User");
    }

    return apiSuccess(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return apiInternalError();
  }
}
