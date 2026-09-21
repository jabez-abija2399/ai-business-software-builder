"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ProjectFilters } from "../hooks/use-project-filters";

/**
 * Instant, debounced search with "/" and "Cmd/Ctrl+K" shortcuts. The shortcut
 * hint swaps to a clear button once the field has content.
 */
export function ProjectSearch({ filters }: { filters: ProjectFilters }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { search, setSearch, clearSearch } = filters;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.matches?.(
          "input, textarea, select, [contenteditable='true']"
        ) ?? false;
      const isShortcut =
        event.key === "/" ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k");

      if (isShortcut && !isEditable) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative w-full sm:w-80">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search projects..."
        aria-label="Search projects by name, ID, or description"
        className="h-9 pl-9 pr-12 [&::-webkit-search-cancel-button]:hidden"
      />
      {search ? (
        <button
          type="button"
          onClick={clearSearch}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : (
        <kbd
          className="pointer-events-none absolute right-2.5 top-1/2 hidden h-5 -translate-y-1/2 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex"
          aria-hidden
        >
          ⌘K
        </kbd>
      )}
    </div>
  );
}