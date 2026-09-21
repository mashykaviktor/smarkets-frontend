import type { Side } from "@/domain/models";
import { formatOdds } from "@/lib/format";

interface PriceButtonProps {
  side: Side | null;
  label: "Back" | "Lay";
  contractName: string;
}

const TONE_CLASSES: Record<PriceButtonProps["label"], string> = {
  Back: "bg-sky-50 text-sky-900 hover:bg-sky-100 focus-visible:outline-sky-600",
  Lay: "bg-rose-50 text-rose-900 hover:bg-rose-100 focus-visible:outline-rose-600",
};

/**
 * A single back/lay price cell. Native `<button>` for keyboard/focus
 * parity with a real exchange grid; order placement is out of scope for
 * this take-home, so activation has no side effect beyond the pressed
 * visual state.
 */
export function PriceButton({ side, label, contractName }: PriceButtonProps) {
  if (!side) {
    return (
      <span
        aria-label={`${label} price unavailable for ${contractName}`}
        className="flex h-11 w-20 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-sm text-zinc-400"
      >
        —
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${label} ${contractName} at ${formatOdds(side.decimalOdds)}`}
      className={`flex h-11 w-20 flex-col items-center justify-center rounded-md text-sm font-semibold tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${TONE_CLASSES[label]}`}
    >
      {formatOdds(side.decimalOdds)}
    </button>
  );
}
