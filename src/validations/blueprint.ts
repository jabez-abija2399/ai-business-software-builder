import { z } from "zod";

export const businessContextSchema = z.object({
  industry: z.string().optional(),
  type: z.string().optional(),
  size: z.string().optional(),
  currentProcess: z.string().optional(),
  painPoints: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
});

export const goalSchema = z.object({
  goal: z.string(),
  priority: z.enum(["MUST", "SHOULD", "COULD", "WONT"]),
  description: z.string().optional(),
});

export const personaSchema = z.object({
  name: z.string(),
  role: z.string(),
  description: z.string(),
  goals: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
});

export const roleSchema = z.object({
  name: z.string(),
  description: z.string(),
  permissions: z.array(z.string()).optional(),
});

export const permissionSchema = z.object({
  resource: z.string(),
  actions: z.array(z.enum(["create", "read", "update", "delete"])),
  roles: z.array(z.string()),
});

export const featureSchema = z.object({
  name: z.string(),
  description: z.string(),
  priority: z.enum(["MUST", "SHOULD", "COULD", "WONT"]),
  requirements: z.array(z.string()).optional(),
});

export const entitySchema = z.object({
  name: z.string(),
  description: z.string(),
  attributes: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean().optional(),
        unique: z.boolean().optional(),
      })
    )
    .optional(),
  relationships: z
    .array(
      z.object({
        type: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
        target: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export const workflowSchema = z.object({
  name: z.string(),
  description: z.string(),
  trigger: z.string(),
  steps: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        actor: z.string().optional(),
      })
    )
    .optional(),
});

export const businessRuleSchema = z.object({
  name: z.string(),
  description: z.string(),
  condition: z.string(),
  action: z.string(),
});

export const integrationSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
  direction: z.enum(["inbound", "outbound", "bidirectional"]),
});

export const nfrSchema = z.object({
  category: z.enum(["performance", "security", "scalability", "usability", "reliability"]),
  requirement: z.string(),
  metric: z.string().optional(),
  target: z.string().optional(),
});

export const createBlueprintSchema = z.object({
  businessContext: businessContextSchema.optional(),
  goals: z.array(goalSchema).optional(),
  personas: z.array(personaSchema).optional(),
  roles: z.array(roleSchema).optional(),
  permissions: z.array(permissionSchema).optional(),
  features: z.array(featureSchema).optional(),
  entities: z.array(entitySchema).optional(),
  workflows: z.array(workflowSchema).optional(),
  businessRules: z.array(businessRuleSchema).optional(),
  integrations: z.array(integrationSchema).optional(),
  nfrs: z.array(nfrSchema).optional(),
});

export const updateBlueprintSchema = createBlueprintSchema.extend({
  status: z.enum(["DRAFT", "REVIEWING", "APPROVED", "ARCHIVED"]).optional(),
  notes: z.string().optional(),
});

export const analyzeBlueprintSchema = z.object({
  businessDescription: z
    .string()
    .min(10, "Please provide more details about your business")
    .max(2000, "Description must be at most 2000 characters"),
  constraints: z
    .object({
      budget: z.enum(["low", "medium", "high"]).optional(),
      timeline: z.string().optional(),
      technicalPreference: z.enum(["business", "developer", "mixed"]).optional(),
    })
    .optional(),
});

export const clarifyBlueprintSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      answer: z.string(),
    })
  ),
});

export type CreateBlueprintInput = z.infer<typeof createBlueprintSchema>;
export type UpdateBlueprintInput = z.infer<typeof updateBlueprintSchema>;
export type AnalyzeBlueprintInput = z.infer<typeof analyzeBlueprintSchema>;
export type ClarifyBlueprintInput = z.infer<typeof clarifyBlueprintSchema>;
