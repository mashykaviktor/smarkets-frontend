/**
 * Raw Smarkets API wire types.
 *
 * These mirror `docs/research/smarkets-openapi.json` and the recorded live
 * samples in `docs/research/api-samples/*.json` — only the fields this app
 * actually consumes are modelled, but every field here is verified against
 * a real response, not guessed.
 *
 * `type` is narrowed to the `{ domain, scope }` object form only: endpoints.ts
 * always sends `with_new_type=true`, so the legacy string-enum form of
 * `event.type` never occurs in responses this app makes.
 */

export type EventState =
  | "new"
  | "upcoming"
  | "live"
  | "ended"
  | "settled"
  | "cancelled"
  | "suspended";

export type EventTypeScope =
  | "root"
  | "round"
  | "category_root"
  | "category"
  | "single_event"
  | "acca_root"
  | "acca_category"
  | "acca"
  | "outright_root"
  | "outright_category"
  | "outright"
  | "tour"
  | "antepost_root"
  | "antepost_category"
  | "antepost";

export interface SmarketsEventType {
  domain: string;
  scope: EventTypeScope;
}

export interface SmarketsEvent {
  id: string;
  parent_id: string | null;
  name: string;
  short_name: string | null;
  slug: string;
  full_slug: string;
  state: EventState;
  start_datetime: string | null;
  bettable: boolean;
  bet_allowed: boolean;
  hidden: boolean;
  display_order: number | null;
  type: SmarketsEventType;
}

export interface SmarketsEventsResponse {
  events: SmarketsEvent[];
}

export interface SmarketsEventsPage extends SmarketsEventsResponse {
  pagination: { next_page: string | null };
}

export type MarketState =
  | "new"
  | "open"
  | "live"
  | "halted"
  | "settled"
  | "voided"
  | "unavailable";

export interface SmarketsMarket {
  id: string;
  event_id: string;
  name: string;
  state: MarketState;
  winner_count: number;
  display_order: number | null;
}

export interface SmarketsMarketsResponse {
  markets: SmarketsMarket[];
}

export type ContractStateOrOutcome =
  | "live"
  | "open"
  | "new"
  | "halted"
  | "winner"
  | "loser"
  | "deadheat"
  | "reduced"
  | "voided"
  | "unavailable";

export interface SmarketsContract {
  id: string;
  market_id: string;
  name: string;
  display_order: number | null;
  state_or_outcome: ContractStateOrOutcome;
}

export interface SmarketsContractsResponse {
  contracts: SmarketsContract[];
}

/**
 * `price` is percentage basis points (1-9999); `quantity` is 1/100 of a UK
 * penny. See `src/domain/price.ts` for the conversion to decimal odds/GBP.
 */
export interface SmarketsQuoteLevel {
  price: number;
  quantity: number;
}

export interface SmarketsQuote {
  bids: SmarketsQuoteLevel[];
  offers: SmarketsQuoteLevel[];
}

/** Keyed by contract id. May contain keys with no matching contract. */
export type SmarketsQuotesResponse = Record<string, SmarketsQuote>;

export interface SmarketsHomeEventRef {
  event_id: string;
  layout: string | null;
  nav_key: string | null;
}

export interface SmarketsHomeSection {
  name: string;
  category: string;
  events: SmarketsHomeEventRef[];
}

export interface SmarketsHomeResponse {
  home: SmarketsHomeSection[];
}

/** POST /v3/sessions/ request body (no-MFA path). */
export interface SmarketsSessionCredentials {
  username: string;
  password: string;
  remember?: boolean;
}

/** POST /v3/sessions/ 201 response (legacy auth, not the auth-v2 variant). */
export interface SmarketsSessionResponse {
  token: string | null;
  stop: string | null;
  factor?: "complete" | "totp" | "nemid";
  verify?: boolean;
}

export interface SmarketsSessionDeleteResponse {
  success: boolean;
}
