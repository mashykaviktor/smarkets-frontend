import type { SmarketsEvent } from "@/server/smarkets/types";
import type { Event } from "@/domain/models";

/**
 * `new` (not yet opened for betting) collapses into `upcoming` for the UI —
 * the two read identically to a bettor and the domain model doesn't need
 * the distinction. Every other state passes through unchanged.
 */
export function toEvent(apiEvent: SmarketsEvent): Event {
  return {
    id: apiEvent.id,
    name: apiEvent.name,
    shortName: apiEvent.short_name,
    slug: apiEvent.slug,
    state: apiEvent.state === "new" ? "upcoming" : apiEvent.state,
    startDatetime: apiEvent.start_datetime,
    bettable: apiEvent.bettable,
  };
}
