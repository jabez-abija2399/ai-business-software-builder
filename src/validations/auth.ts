import { z } from "zod";

export const passwordPolicy = [
  z.string().min(8, "Password must be at least 8 characters"),
  z.string().regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
  z.string().regex(/[a-z]/, "Password must contain at least one lowercase letter"),
  z.string().regex(/[0-9]/, "Password must contain at least one number"),
];

export const signupSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .trim(),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: passwordPolicy[0].and(passwordPolicy[1]).and(passwordPolicy[2]).and(passwordPolicy[3]),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
});

export const updateEmailSchema = z.string().trim().email("Invalid email address").toLowerCase();

export const updateNameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be at most 100 characters")
  .trim();

export type SignupInput = z.infer<typeof signupSchema>;
export type SignInInput = z.infer<typeof signInSchema>;