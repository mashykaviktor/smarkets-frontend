/**
 * UI-facing domain models. Deliberately decoupled from the Smarkets wire
 * types in `server/smarkets/types.ts` — only the feature adapter modules
 * are allowed to convert between the two.
 */

export type EventState = "upcoming" | "live" | "ended" | "settled" | "cancelled" | "suspended";

export interface Event {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  state: EventState;
  /** ISO 8601, or null when not yet scheduled. Formatting is a presentation concern. */
  startDatetime: string | null;
  bettable: boolean;
}

export type MarketState = "new" | "open" | "live" | "halted" | "settled" | "voided" | "unavailable";

export interface Market {
  id: string;
  eventId: string;
  name: string;
  state: MarketState;
  winnerCount: number;
}

export interface Contract {
  id: string;
  marketId: string;
  name: string;
  displayOrder: number | null;
}

export interface Side {
  decimalOdds: number;
  priceBp: number;
  /**
   * GBP value of the matched-pot quantity at this price level, per the
   * spec's back-stake conversion (`quantity * priceBp / 100_000_000`) —
   * the OpenAPI quote schema documents this identical formula, verbatim,
   * for both `bids` and `offers` ticks (diffed programmatically: byte-for-
   * byte identical descriptions), so it's spec-justified for back and lay
   * alike as a level-size/depth figure, not an invented conversion.
   *
   * It is NOT the same thing as lay liability. The spec's separate
   * `/v3/markets/{ids}/volumes/` endpoint explicitly treats "back stake"
   * and "liability" as two different, summed quantities ("the sum of back
   * stake (on the back side) with liability (on the lay side)") — so this
   * field is deliberately displayed as "Available" in the UI, never
   * "stake" or "liability", to avoid implying a specific side's risk.
   */
  stake: number;
}

export interface ContractPrice {
  contractId: string;
  /** Best back = lowest offers price. */
  back: Side | null;
  /** Best lay = highest bids price. */
  lay: Side | null;
  /** False when the contract has no liquidity on either side — a primary state, not an edge case. */
  hasPrice: boolean;
}
