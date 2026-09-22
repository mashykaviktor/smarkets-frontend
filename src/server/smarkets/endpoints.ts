import "server-only";
import { smarketsRequest } from "./client";
import type {
  SmarketsContractsResponse,
  SmarketsEvent,
  SmarketsEventsPage,
  SmarketsEventsResponse,
  SmarketsHomeResponse,
  SmarketsMarketsResponse,
  SmarketsQuotesResponse,
  SmarketsSessionCredentials,
  SmarketsSessionDeleteResponse,
  SmarketsSessionResponse,
} from "./types";

/**
 * Verified batch caps (smarkets-openapi.json `maxItems`). Every list
 * endpoint below chunks its id list against the relevant cap and fans out
 * with `Promise.all`, so a "refresh" stays one logical call to the caller
 * regardless of how many upstream requests it costs.
 */
export const EVENT_IDS_MAX = 300;
export const MARKET_EVENT_IDS_MAX = 50;
export const CONTRACT_MARKET_IDS_MAX = 100;
export const QUOTE_MARKET_IDS_MAX = 200;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error("chunk size must be positive");
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

type QueryValue = string | number | boolean | readonly string[] | undefined;

/**
 * Serialises query params for the Smarkets API. Array values are emitted as
 * repeated keys (`parent_id=a&parent_id=b`) — verified live that the
 * comma-joined form (`parent_id=a,b`) is a hard 400
 * (`REQUEST_VALIDATION_ERROR`). Path-segment id lists are a separate,
 * comma-joined concern and are built inline where the path is built, not
 * through this helper.
 */
export function buildQuery(params: Record<string, QueryValue>): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, item);
    } else {
      search.append(key, String(value));
    }
  }
  return search;
}

export interface RequestContext {
  token?: string | null;
  signal?: AbortSignal;
}

export async function fetchPopularHome(ctx: RequestContext = {}): Promise<SmarketsHomeResponse> {
  return smarketsRequest<SmarketsHomeResponse>({
    path: "/v3/popular/home/",
    revalidateSeconds: 60,
    ...ctx,
  });
}

/** GET /v3/events/{event_ids}/ — chunked at 300, always with_new_type=true. */
export async function fetchEventsByIds(
  eventIds: readonly string[],
  ctx: RequestContext = {},
): Promise<SmarketsEvent[]> {
  const results = await Promise.all(
    chunk(eventIds, EVENT_IDS_MAX).map((idsChunk) =>
      smarketsRequest<SmarketsEventsResponse>({
        path: `/v3/events/${idsChunk.join(",")}/`,
        searchParams: buildQuery({ with_new_type: true }),
        revalidateSeconds: 300,
        ...ctx,
      }),
    ),
  );
  return results.flatMap((result) => result.events);
}

export interface FetchEventsByParentIdsOptions extends RequestContext {
  state?: readonly string[];
  limit?: number;
}

/**
 * GET /v3/events/?parent_id=...&type_scope=single_event — resolves category
 * nodes (`type.scope === "category"`) to their bettable leaf events. A
 * single call with all parent ids repeated resolves every node at once.
 *
 * `pagination.next_page` is typed and returned but deliberately NOT
 * followed — only the first (unauthenticated, 50-per-page-capped) page is
 * consumed. In the verified sample, 6 category nodes resolved to 50
 * children in one call, right at the cap; a homepage with more category
 * nodes or deeper category trees could silently truncate. Accepted as a
 * six-hour-scope limitation rather than adding cursor-following complexity
 * for a homepage that's capped to 8 events per section anyway.
 */
export async function fetchEventsByParentIds(
  parentIds: readonly string[],
  { state = ["upcoming", "live"], limit = 50, ...ctx }: FetchEventsByParentIdsOptions = {},
): Promise<SmarketsEventsPage> {
  return smarketsRequest<SmarketsEventsPage>({
    path: "/v3/events/",
    searchParams: buildQuery({
      parent_id: parentIds,
      type_scope: "single_event",
      state,
      with_new_type: true,
      limit,
    }),
    revalidateSeconds: 300,
    ...ctx,
  });
}

export interface FetchMarketsOptions extends RequestContext {
  limitByEvent?: number;
}

/** GET /v3/events/{event_ids}/markets/ — chunked at 50. */
export async function fetchMarketsForEvents(
  eventIds: readonly string[],
  { limitByEvent, ...ctx }: FetchMarketsOptions = {},
): Promise<SmarketsMarketsResponse["markets"]> {
  const results = await Promise.all(
    chunk(eventIds, MARKET_EVENT_IDS_MAX).map((idsChunk) =>
      smarketsRequest<SmarketsMarketsResponse>({
        path: `/v3/events/${idsChunk.join(",")}/markets/`,
        searchParams: buildQuery({ limit_by_event: limitByEvent }),
        revalidateSeconds: 300,
        ...ctx,
      }),
    ),
  );
  return results.flatMap((result) => result.markets);
}

/** GET /v3/markets/{market_ids}/contracts/ — chunked at 100. */
export async function fetchContractsForMarkets(
  marketIds: readonly string[],
  ctx: RequestContext = {},
): Promise<SmarketsContractsResponse["contracts"]> {
  const results = await Promise.all(
    chunk(marketIds, CONTRACT_MARKET_IDS_MAX).map((idsChunk) =>
      smarketsRequest<SmarketsContractsResponse>({
        path: `/v3/markets/${idsChunk.join(",")}/contracts/`,
        revalidateSeconds: 300,
        ...ctx,
      }),
    ),
  );
  return results.flatMap((result) => result.contracts);
}

/**
 * GET /v3/markets/{market_ids}/quotes/ — chunked at 200, never cached. The
 * per-chunk keyed responses are merged into one object; quotes may include
 * keys for contracts absent from the contracts endpoint, so callers must
 * join by iterating contracts and looking up quotes, never the reverse.
 */
export async function fetchQuotesForMarkets(
  marketIds: readonly string[],
  ctx: RequestContext = {},
): Promise<SmarketsQuotesResponse> {
  const results = await Promise.all(
    chunk(marketIds, QUOTE_MARKET_IDS_MAX).map((idsChunk) =>
      smarketsRequest<SmarketsQuotesResponse>({
        path: `/v3/markets/${idsChunk.join(",")}/quotes/`,
        cache: "no-store",
        ...ctx,
      }),
    ),
  );
  return Object.assign({}, ...results);
}

/**
 * POST /v3/sessions/ — no-MFA path only (per decision). `factor` in the
 * response tells the caller whether login is actually complete; a
 * `totp`/`nemid` factor means the token, if any, is not yet usable.
 */
export async function createSession(
  credentials: SmarketsSessionCredentials,
  ctx: RequestContext = {},
): Promise<SmarketsSessionResponse> {
  return smarketsRequest<SmarketsSessionResponse>({
    path: "/v3/sessions/",
    method: "POST",
    body: credentials,
    ...ctx,
  });
}

/** DELETE /v3/sessions/ — logs out the token attached via `ctx.token`. */
export async function deleteSession(ctx: RequestContext = {}): Promise<SmarketsSessionDeleteResponse> {
  return smarketsRequest<SmarketsSessionDeleteResponse>({
    path: "/v3/sessions/",
    method: "DELETE",
    ...ctx,
  });
}
