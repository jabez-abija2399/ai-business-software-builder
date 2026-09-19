import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional(),
  mode: z.enum(["BUSINESS", "DEVELOPER", "MIXED"]).default("BUSINESS"),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be at most 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional(),
  mode: z.enum(["BUSINESS", "DEVELOPER", "MIXED"]).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const projectIdSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
