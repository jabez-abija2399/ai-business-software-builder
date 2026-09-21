import { z } from "zod";

export const projectEnvironmentSchema = z.enum([
  "DEVELOPMENT",
  "STAGING",
  "PRODUCTION",
]);

export const projectFilterSchema = z.enum([
  "all",
  "production",
  "staging",
  "development",
  "archived",
]);

export const projectSortSchema = z.enum(["updated", "created", "name"]);

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be at most 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional(),
  mode: z.enum(["BUSINESS", "DEVELOPER", "MIXED"]).default("BUSINESS"),
  environment: projectEnvironmentSchema.default("DEVELOPMENT"),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be at most 100 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional(),
  mode: z.enum(["BUSINESS", "DEVELOPER", "MIXED"]).optional(),
  environment: projectEnvironmentSchema.optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const listProjectsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  filter: projectFilterSchema.default("all"),
  sort: projectSortSchema.default("updated"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export const projectIdSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type ProjectEnvironment = z.infer<typeof projectEnvironmentSchema>;
export type ProjectFilter = z.infer<typeof projectFilterSchema>;
export type ProjectSort = z.infer<typeof projectSortSchema>;
