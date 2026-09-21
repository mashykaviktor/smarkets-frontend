import type { Event } from "@/domain/models";
import type { MarketSummary } from "@/features/markets/types";

export interface HomeEventSummary {
  event: Event;
  /** null when the event currently has no markets (rare, handled explicitly). */
  market: MarketSummary | null;
}

export interface HomeSection {
  name: string;
  category: string;
  events: HomeEventSummary[];
}

export interface HomeResponse {
  sections: HomeSection[];
}
