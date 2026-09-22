import { NextResponse } from "next/server";
import {
  fetchContractsForMarkets,
  fetchEventsByIds,
  fetchMarketsForEvents,
  fetchQuotesForMarkets,
} from "@/server/smarkets/endpoints";
import { isSmarketsApiError } from "@/server/smarkets/errors";
import { getSessionToken } from "@/server/smarkets/session";
import type { SmarketsContract } from "@/server/smarkets/types";
import { toEvent } from "@/features/events/adapters";
import type { EventPageResponse } from "@/features/events/types";
import { toContract, toMarket } from "@/features/markets/adapters";
import { toContractPrices } from "@/features/prices/adapters";

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

/**
 * Same shape as /api/smarkets/home, minus `limitByEvent` — every market for
 * this event is returned, which is precisely the "more available markets"
 * the brief asks for on the event page.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { eventId } = await params;

  try {
    const token = await getSessionToken();
    const [event] = await fetchEventsByIds([eventId], { token });
    if (!event) {
      return NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
    }

    const rawMarkets = await fetchMarketsForEvents([eventId], { token });
    const marketIds = rawMarkets.map((market) => market.id);

    const rawContracts = marketIds.length > 0 ? await fetchContractsForMarkets(marketIds, { token }) : [];
    const contractsByMarketId = new Map<string, SmarketsContract[]>();
    for (const contract of rawContracts) {
      const siblings = contractsByMarketId.get(contract.market_id) ?? [];
      siblings.push(contract);
      contractsByMarketId.set(contract.market_id, siblings);
    }

    const rawQuotes = marketIds.length > 0 ? await fetchQuotesForMarkets(marketIds, { token }) : {};
    const priceByContractId = new Map(
      toContractPrices(
        rawContracts.map((c) => c.id),
        rawQuotes,
      ).map((price) => [price.contractId, price]),
    );

    const response: EventPageResponse = {
      event: toEvent(event),
      markets: rawMarkets.map((rawMarket) => {
        const contracts = (contractsByMarketId.get(rawMarket.id) ?? []).map(toContract);
        return {
          market: toMarket(rawMarket),
          contracts,
          prices: contracts.map(
            (contract) =>
              priceByContractId.get(contract.id) ?? {
                contractId: contract.id,
                back: null,
                lay: null,
                hasPrice: false,
              },
          ),
        };
      }),
    };

    return NextResponse.json(response);
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
