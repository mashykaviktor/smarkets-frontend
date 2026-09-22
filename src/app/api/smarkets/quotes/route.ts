import { NextResponse } from "next/server";
import { fetchQuotesForMarkets } from "@/server/smarkets/endpoints";
import { isSmarketsApiError } from "@/server/smarkets/errors";
import { getSessionToken } from "@/server/smarkets/session";
import { toContractPrices } from "@/features/prices/adapters";

interface QuotesRequestBody {
  marketIds?: unknown;
  contractIds?: unknown;
}

function toIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id): id is string => typeof id === "string");
}

/**
 * The only polled route. One request covers every market currently on
 * screen (chunked internally at the verified 200 cap) — the client never
 * issues one request per market or per contract.
 *
 * POST, not GET: the event page shows every contract for every market,
 * uncapped (per the brief's "more available markets" requirement), so
 * `contractIds` has no upper bound. A GET query string risks the ~8-16KB
 * header-size ceiling most servers/proxies enforce for a large event; a
 * JSON body has no such limit. `contractIds` still has to be sent
 * explicitly (not derived from the quotes response's own keys) to
 * preserve the join-direction invariant in `toContractPrices` — quotes
 * can include keys for contracts that don't exist, and iterating those
 * keys instead of the known contract list would surface them as nameless
 * rows (verified: 208 quote keys vs 133 contracts for the same markets).
 */
export async function POST(request: Request) {
  const body: QuotesRequestBody = await request.json().catch(() => ({}));
  const marketIds = toIdList(body.marketIds);
  const contractIds = toIdList(body.contractIds);

  if (marketIds.length === 0 || contractIds.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const token = await getSessionToken();
    const rawQuotes = await fetchQuotesForMarkets(marketIds, { token });
    return NextResponse.json(toContractPrices(contractIds, rawQuotes));
  } catch (error) {
    if (isSmarketsApiError(error)) {
      return NextResponse.json(
        { error: error.errorType ?? "UPSTREAM_ERROR" },
        { status: error.status || 502 },
      );
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
