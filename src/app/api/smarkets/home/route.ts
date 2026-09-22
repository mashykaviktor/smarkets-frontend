import { NextResponse } from "next/server";
import {
  fetchContractsForMarkets,
  fetchEventsByIds,
  fetchEventsByParentIds,
  fetchMarketsForEvents,
  fetchPopularHome,
  fetchQuotesForMarkets,
} from "@/server/smarkets/endpoints";
import { isSmarketsApiError } from "@/server/smarkets/errors";
import { getSessionToken } from "@/server/smarkets/session";
import type { SmarketsContract, SmarketsEvent } from "@/server/smarkets/types";
import { buildHomeSections } from "@/features/home/adapters";
import type { HomeResponse } from "@/features/home/types";
import { toContract, toMarket } from "@/features/markets/adapters";
import { toContractPrices } from "@/features/prices/adapters";

/**
 * Assembles the homepage feed in the 4 batched calls documented in
 * docs/implementation-plan.md §4/§5: popular/home -> events (+ one
 * parent_id call to resolve any category nodes) -> markets (one headline
 * market per event) -> contracts, joined with one quotes call. No
 * per-event or per-market fan-out.
 */
export async function GET() {
  try {
    const token = await getSessionToken();
    const home = await fetchPopularHome({ token });

    const allEventIds = Array.from(
      new Set(home.home.flatMap((section) => section.events.map((ref) => ref.event_id))),
    );
    const events = allEventIds.length > 0 ? await fetchEventsByIds(allEventIds, { token }) : [];
    const eventsById = new Map(events.map((event) => [event.id, event]));

    const categoryIds = events.filter((event) => event.type.scope === "category").map((event) => event.id);
    const childrenByParentId = new Map<string, SmarketsEvent[]>();
    if (categoryIds.length > 0) {
      const childrenPage = await fetchEventsByParentIds(categoryIds, { token });
      for (const child of childrenPage.events) {
        if (!child.parent_id) continue;
        const siblings = childrenByParentId.get(child.parent_id) ?? [];
        siblings.push(child);
        childrenByParentId.set(child.parent_id, siblings);
      }
    }

    const sections = buildHomeSections(home.home, eventsById, childrenByParentId);
    const sectionEventIds = Array.from(new Set(sections.flatMap((s) => s.events.map((e) => e.id))));

    const rawMarkets =
      sectionEventIds.length > 0
        ? await fetchMarketsForEvents(sectionEventIds, { limitByEvent: 1, token })
        : [];
    const marketByEventId = new Map(rawMarkets.map((market) => [market.event_id, market]));
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

    const response: HomeResponse = {
      sections: sections.map((section) => ({
        name: section.name,
        category: section.category,
        events: section.events.map((event) => {
          const rawMarket = marketByEventId.get(event.id);
          if (!rawMarket) {
            return { event, market: null };
          }

          const contracts = (contractsByMarketId.get(rawMarket.id) ?? []).map(toContract);
          return {
            event,
            market: {
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
            },
          };
        }),
      })),
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
