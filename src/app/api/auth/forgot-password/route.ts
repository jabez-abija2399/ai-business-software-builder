import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiValidationError, apiNotFound, apiInternalError } from "@/lib/api-response";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return apiValidationError(validationResult.error.flatten());
    }

    const { email } = validationResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return apiNotFound("User");
    }

    const resetToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpiry,
      },
    });

    return apiSuccess({
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Error processing forgot password:", error);
    return apiInternalError();
  }
}
