"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { Side } from "@/domain/models";
import { formatOdds, formatStake } from "@/lib/format";
import { usePreviousPrice } from "@/features/prices/usePreviousPrice";

interface PriceButtonProps {
  side: Side | null;
  label: "Back" | "Lay";
  contractName: string;
}

const TONE_CLASSES: Record<PriceButtonProps["label"], string> = {
  Back: "bg-sky-50 text-sky-900 hover:bg-sky-100 focus-visible:outline-sky-600",
  Lay: "bg-rose-50 text-rose-900 hover:bg-rose-100 focus-visible:outline-rose-600",
};

const DIRECTION_RING: Record<"up" | "down", string> = {
  up: "ring-2 ring-inset ring-emerald-500",
  down: "ring-2 ring-inset ring-red-500",
};

/**
 * A single back/lay price cell. Native `<button>` for keyboard/focus
 * parity with a real exchange grid; order placement is out of scope for
 * this take-home, so activation has no side effect beyond the pressed
 * visual state. Briefly rings green/red with a directional arrow when the
 * price moves — restrained, not a casino flash.
 */
export function PriceButton({ side, label, contractName }: PriceButtonProps) {
  const direction = usePreviousPrice(side?.decimalOdds ?? null);

  if (!side) {
    return (
      <span
        aria-label={`${label} price unavailable for ${contractName}`}
        className="flex h-12 w-20 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-sm text-zinc-500"
      >
        —
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${label} ${contractName} at ${formatOdds(side.decimalOdds)}, ${formatStake(side.stake)} available`}
      className={`flex h-12 w-20 flex-col items-center justify-center gap-0 rounded-md text-sm font-semibold tabular-nums transition-colors duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${TONE_CLASSES[label]} ${direction ? DIRECTION_RING[direction] : ""}`}
    >
      <span className="flex items-center gap-0.5">
        {direction === "up" && <ArrowUp className="h-3 w-3 text-emerald-600" aria-hidden="true" />}
        {direction === "down" && <ArrowDown className="h-3 w-3 text-red-600" aria-hidden="true" />}
        {formatOdds(side.decimalOdds)}
      </span>
      <span className="text-[10px] font-normal leading-none opacity-70" aria-hidden="true">
        {formatStake(side.stake)}
      </span>
    </button>
  );
}
