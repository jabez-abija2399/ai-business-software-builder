"use client";

import { useEffect, useState } from "react";

/**
 * Returns the value only after it has been stable for `delay` ms.
 * Used to debounce search without a dependency.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}