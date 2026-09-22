import { describe, expect, it } from "vitest";
import { applyLivePrices } from "@/features/markets/adapters";
import type { MarketSummary } from "@/features/markets/types";

const BASE_SUMMARY: MarketSummary = {
  market: { id: "m1", eventId: "e1", name: "Winner", state: "open", winnerCount: 1 },
  contracts: [
    { id: "c1", marketId: "m1", name: "A", displayOrder: 0 },
    { id: "c2", marketId: "m1", name: "B", displayOrder: 1 },
  ],
  prices: [
    { contractId: "c1", back: { decimalOdds: 2, priceBp: 5000, stake: 1 }, lay: null, hasPrice: true },
    { contractId: "c2", back: null, lay: null, hasPrice: false },
  ],
};

describe("applyLivePrices", () => {
  it("returns the summary unchanged when no live prices are available yet", () => {
    expect(applyLivePrices(BASE_SUMMARY, undefined)).toBe(BASE_SUMMARY);
  });

  it("replaces prices for contracts covered by the live poll", () => {
    const live = [
      { contractId: "c1", back: { decimalOdds: 2.5, priceBp: 4000, stake: 2 }, lay: null, hasPrice: true },
    ];

    const merged = applyLivePrices(BASE_SUMMARY, live);

    expect(merged.prices.find((p) => p.contractId === "c1")?.back?.decimalOdds).toBe(2.5);
  });

  it("falls back to the structural price for a contract the live poll hasn't covered", () => {
    const live = [
      { contractId: "c1", back: { decimalOdds: 2.5, priceBp: 4000, stake: 2 }, lay: null, hasPrice: true },
    ];

    const merged = applyLivePrices(BASE_SUMMARY, live);

    expect(merged.prices.find((p) => p.contractId === "c2")).toEqual(BASE_SUMMARY.prices[1]);
  });
});
