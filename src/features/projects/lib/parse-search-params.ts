import { listProjectsQuerySchema } from "@/validations/project";
import type { ListProjectsParams } from "../types";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

/**
 * Parses raw URL search params (Next.js may deliver arrays when a key repeats)
 * into validated list params with safe defaults. Never throws — a malformed
 * URL falls back to the default view.
 */
export function parseListSearchParams(
  searchParams: RawSearchParams
): ListProjectsParams {
  const parsed = listProjectsQuerySchema.safeParse({
    search: first(searchParams["q"]),
    filter: first(searchParams["filter"]),
    sort: first(searchParams["sort"]),
    limit: first(searchParams["limit"]),
    cursor: first(searchParams["cursor"]),
  });

  if (parsed.success) {
    return parsed.data;
  }

  return {
    search: undefined,
    filter: "all",
    sort: "updated",
    limit: 20,
    cursor: undefined,
  };
}