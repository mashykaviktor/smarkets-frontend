import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "live" | "positive" | "warning";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-zinc-100 text-zinc-600",
  live: "bg-red-50 text-red-700",
  positive: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
