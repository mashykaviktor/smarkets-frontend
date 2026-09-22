import type { SmarketsContract, SmarketsMarket } from "@/server/smarkets/types";
import type { Contract, ContractPrice, Market } from "@/domain/models";
import type { MarketSummary } from "./types";

export function toMarket(apiMarket: SmarketsMarket): Market {
  return {
    id: apiMarket.id,
    eventId: apiMarket.event_id,
    name: apiMarket.name,
    state: apiMarket.state,
    winnerCount: apiMarket.winner_count,
  };
}

export function toContract(apiContract: SmarketsContract): Contract {
  return {
    id: apiContract.id,
    marketId: apiContract.market_id,
    name: apiContract.name,
    displayOrder: apiContract.display_order,
  };
}

/**
 * Replaces a market summary's prices with fresher ones from the polled
 * quotes query, falling back to the summary's own (structural-fetch-time)
 * prices for any contract the live data hasn't covered yet — e.g. the
 * brief window before the first poll resolves.
 */
export function applyLivePrices(
  summary: MarketSummary,
  livePrices: readonly ContractPrice[] | undefined,
): MarketSummary {
  if (!livePrices) {
    return summary;
  }

  const liveByContractId = new Map(livePrices.map((price) => [price.contractId, price]));
  const structuralByContractId = new Map(summary.prices.map((price) => [price.contractId, price]));

  return {
    ...summary,
    prices: summary.contracts.map(
      (contract) =>
        liveByContractId.get(contract.id) ??
        structuralByContractId.get(contract.id) ?? {
          contractId: contract.id,
          back: null,
          lay: null,
          hasPrice: false,
        },
    ),
  };
}
