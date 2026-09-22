"use client";

import { useEffect, useRef, useState } from "react";

export type PriceDirection = "up" | "down" | null;

const FLASH_MS = 600;

/**
 * Diffs a decimal odds value between renders and returns a transient
 * direction ("up"/"down") for FLASH_MS after it changes, then clears back
 * to null — drives the price-movement tint/arrow. "Up" = drifting
 * (odds increasing), "down" = shortening (odds decreasing), independent
 * of back/lay side.
 */
export function usePreviousPrice(value: number | null | undefined): PriceDirection {
  const previousRef = useRef(value);
  const [direction, setDirection] = useState<PriceDirection>(null);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = value;

    if (previous == null || value == null || value === previous) {
      return;
    }

    setDirection(value > previous ? "up" : "down");
    const timeout = setTimeout(() => setDirection(null), FLASH_MS);
    return () => clearTimeout(timeout);
  }, [value]);

  return direction;
}
