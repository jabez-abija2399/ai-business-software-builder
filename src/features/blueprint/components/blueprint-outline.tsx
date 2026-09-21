"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BLUEPRINT_SECTIONS } from "../lib/sections";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Sticky section outline with intersection-based active tracking. Navigation
 * is a real hyperlink target to the rendered section — no second system.
 */
export function BlueprintOutline({ sectionIds }: { sectionIds: string[] }) {
  const [active, setActive] = useState<string | null>(sectionIds[0] ?? null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sectionIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav aria-label="Blueprint sections" className="space-y-0.5">
      {sectionIds.map((id) => {
        const meta = BLUEPRINT_SECTIONS.find((s) => s.id === id);
        if (!meta) return null;
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActive(id);
              scrollToSection(id);
            }}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {meta.title}
          </button>
        );
      })}
    </nav>
  );
}

/** Compact section jump for small screens (per A5.9). */
export function BlueprintSectionJump({ sectionIds }: { sectionIds: string[] }) {
  return (
    <label className="block lg:hidden">
      <span className="mb-1 block text-[12px] font-medium text-muted-foreground">
        Blueprint sections
      </span>
      <select
        aria-label="Jump to blueprint section"
        onChange={(e) => e.target.value && scrollToSection(e.target.value)}
        defaultValue=""
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="" disabled>
          Choose a section…
        </option>
        {BLUEPRINT_SECTIONS.filter((s) => sectionIds.includes(s.id)).map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
    </label>
  );
}