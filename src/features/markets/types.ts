import type { Contract, ContractPrice, Market } from "@/domain/models";

/** A market with its contracts and their current prices, index-aligned to contracts. */
export interface MarketSummary {
  market: Market;
  contracts: Contract[];
  prices: ContractPrice[];
}
