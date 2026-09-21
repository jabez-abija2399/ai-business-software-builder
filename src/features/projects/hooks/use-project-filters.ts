"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PROJECT_FILTERS,
  PROJECT_SORTS,
  type ProjectFilter,
  type ProjectSort,
} from "../types";
import { useDebouncedValue } from "./use-debounced-value";

function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Single source of truth for the projects page filters, kept in the URL so
 * views are shareable and the back button works. Search is debounced client
 * side and only pushed to the URL after it has settled.
 */
export function useProjectFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = parseEnum(searchParams.get("filter"), PROJECT_FILTERS, "all");
  const sort = parseEnum(searchParams.get("sort"), PROJECT_SORTS, "updated");
  const urlSearch = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, 250);
  const lastPushedRef = useRef<string | null>(null);

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  // Push the settled search term into the URL.
  useEffect(() => {
    if (debouncedSearch !== urlSearch) {
      lastPushedRef.current = debouncedSearch;
      setParams({ q: debouncedSearch || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync from the URL (back/forward, manual edits) without clobbering typing.
  useEffect(() => {
    if (urlSearch !== lastPushedRef.current) {
      setSearchInput(urlSearch);
    }
  }, [urlSearch]);

  const setFilter = useCallback(
    (next: ProjectFilter) => {
      setParams({ filter: next === "all" ? undefined : next });
    },
    [setParams]
  );

  const setSort = useCallback(
    (next: ProjectSort) => {
      setParams({ sort: next === "updated" ? undefined : next });
    },
    [setParams]
  );

  const clearSearch = useCallback(() => setSearchInput(""), []);

  /**
   * Clears every filter in a single navigation (multiple sequential
   * `setParams` calls would otherwise clobber each other in the same render).
   */
  const reset = useCallback(() => {
    lastPushedRef.current = "";
    setSearchInput("");
    setParams({ q: undefined, filter: undefined, sort: undefined });
  }, [setParams]);

  const isFiltered =
    filter !== "all" || sort !== "updated" || urlSearch.length > 0;

  return {
    search: searchInput,
    setSearch: setSearchInput,
    clearSearch,
    reset,
    searchQuery: urlSearch,
    filter,
    setFilter,
    sort,
    setSort,
    isFiltered,
  };
}

export type ProjectFilters = ReturnType<typeof useProjectFilters>;