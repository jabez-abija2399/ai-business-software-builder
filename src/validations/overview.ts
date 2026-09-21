import { z } from "zod";
import { OVERVIEW_RANGES } from "@/features/project-detail/types";

export const overviewRangeSchema = z.enum(OVERVIEW_RANGES);

export const overviewQuerySchema = z.object({
  range: overviewRangeSchema.default("7d"),
});

export type OverviewRange = z.infer<typeof overviewRangeSchema>;
export type OverviewQuery = z.infer<typeof overviewQuerySchema>;