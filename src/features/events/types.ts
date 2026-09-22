import type { Event } from "@/domain/models";
import type { MarketSummary } from "@/features/markets/types";

export interface EventPageResponse {
  event: Event;
  markets: MarketSummary[];
}
