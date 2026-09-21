"use client";

import { useEffect, useState } from "react";

/**
 * Tracks elapsed time since a data timestamp so the UI can always report how
 * fresh the numbers are without a full re-render loop.
 */
export function useFreshness(updatedAt: string | undefined) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, [updatedAt]);

  if (now == null || !updatedAt) return "";
  const seconds = Math.round((now - new Date(updatedAt).getTime()) / 1000);
  if (seconds < 3) return "updated just now";
  if (seconds < 60) return `updated ${seconds}s ago`;
  if (seconds < 3_600) return `updated ${Math.round(seconds / 60)}m ago`;
  return `updated ${Math.round(seconds / 3_600)}h ago`;
}