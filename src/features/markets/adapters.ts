import type { SmarketsContract, SmarketsMarket } from "@/server/smarkets/types";
import type { Contract, Market } from "@/domain/models";

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
