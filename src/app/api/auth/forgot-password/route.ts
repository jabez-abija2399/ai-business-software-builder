import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, apiValidationError, apiInternalError, apiRateLimited } from "@/lib/api-response";
import { forgotPasswordSchema } from "@/validations/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limited = rateLimit(`forgot-password:${ip}`, { limit: 5, windowMs: 60_000 });

    if (!limited.success) {
      return apiRateLimited(limited.retryAfterSeconds);
    }

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
      return apiSuccess({
        message: "If an account exists for this email, a password reset link has been sent.",
      });
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
      message: "If an account exists for this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Error processing forgot password:", error);
    return apiInternalError();
  }
}
