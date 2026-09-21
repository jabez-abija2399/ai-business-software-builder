import { z } from "zod";

/**
 * Payloads for the pipeline stage actions (Design → Build → Quality → Preview
 * → Deploy). Bodies are intentionally small — the real state lives in AgentRun
 * / artifact / deployment rows, never in invented job descriptors.
 */

export const generateDesignSchema = z.object({});

export const startBuildSchema = z.object({});

export const runQualitySchema = z.object({});

export const createPreviewSchema = z.object({});

export const createDeploymentSchema = z.object({
  environment: z.enum(["staging", "production"] as const, {
    errorMap: () => ({ message: "Environment must be 'staging' or 'production'" }),
  }),
});

export type GenerateDesignInput = z.infer<typeof generateDesignSchema>;
export type StartBuildInput = z.infer<typeof startBuildSchema>;
export type RunQualityInput = z.infer<typeof runQualitySchema>;
export type CreatePreviewInput = z.infer<typeof createPreviewSchema>;
export type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;