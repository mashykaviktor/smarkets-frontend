import { NextResponse } from "next/server";
import { fetchQuotesForMarkets } from "@/server/smarkets/endpoints";
import { isSmarketsApiError } from "@/server/smarkets/errors";
import { getSessionToken } from "@/server/smarkets/session";
import { toContractPrices } from "@/features/prices/adapters";

function splitIds(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * The only polled route. One request covers every market currently on
 * screen (chunked internally at the verified 200 cap) — the client never
 * issues one request per market or per contract.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const marketIds = splitIds(url.searchParams.get("marketIds"));
  const contractIds = splitIds(url.searchParams.get("contractIds"));

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
