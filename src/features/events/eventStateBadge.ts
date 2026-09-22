import type { BadgeTone } from "@/components/ui/Badge";
import type { EventState } from "@/domain/models";

export const EVENT_STATE_TONE: Record<EventState, BadgeTone> = {
  live: "live",
  upcoming: "neutral",
  ended: "neutral",
  settled: "neutral",
  cancelled: "warning",
  suspended: "warning",
};

export const EVENT_STATE_LABEL: Record<EventState, string> = {
  live: "Live",
  upcoming: "Upcoming",
  ended: "Ended",
  settled: "Settled",
  cancelled: "Cancelled",
  suspended: "Suspended",
};
