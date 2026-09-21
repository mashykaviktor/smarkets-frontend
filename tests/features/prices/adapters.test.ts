import { describe, expect, it } from "vitest";
import { toContractPrice, toContractPrices } from "@/features/prices/adapters";
import type { SmarketsQuote, SmarketsQuotesResponse } from "@/server/smarkets/types";

// Recorded live from docs/research/api-samples/quotes-single.json — contract
// 399766485, "Luiz Inácio Lula da Silva" in the Brazil presidential election
// market. Real book, not invented.
const LULA_QUOTE: SmarketsQuote = {
  bids: [
    { price: 3788, quantity: 2_376_314 },
    { price: 3676, quantity: 1_767_234 },
    { price: 3597, quantity: 2_794_122 },
  ],
  offers: [
    { price: 4032, quantity: 140_923 },
    { price: 4098, quantity: 6_845 },
    { price: 9999, quantity: 494_949 },
  ],
};

// Contract 399766487 from the same sample — no bids at all, offers only.
const BACK_ONLY_QUOTE: SmarketsQuote = {
  bids: [],
  offers: [
    { price: 20, quantity: 4_234_693 },
    { price: 9999, quantity: 494_949 },
  ],
};

describe("toContractPrice", () => {
  it("best back is the LOWEST offer and best lay is the HIGHEST bid", () => {
    const price = toContractPrice("399766485", LULA_QUOTE);

    expect(price.back?.priceBp).toBe(4032);
    expect(price.back?.decimalOdds).toBeCloseTo(2.48, 2);
    expect(price.lay?.priceBp).toBe(3788);
    expect(price.lay?.decimalOdds).toBeCloseTo(2.64, 2);
    expect(price.hasPrice).toBe(true);
  });

  it("a one-sided book (no bids) yields a null lay side, not a crash or a fabricated one", () => {
    const price = toContractPrice("399766487", BACK_ONLY_QUOTE);

    expect(price.back?.priceBp).toBe(20);
    expect(price.lay).toBeNull();
    expect(price.hasPrice).toBe(true);
  });

  it("empty bids and offers produce hasPrice: false, not NaN/Infinity", () => {
    const price = toContractPrice("000000000", { bids: [], offers: [] });

    expect(price.back).toBeNull();
    expect(price.lay).toBeNull();
    expect(price.hasPrice).toBe(false);
  });

  it("a missing quote (contract absent from the quotes response) is the same as no liquidity", () => {
    const price = toContractPrice("000000000", undefined);

    expect(price.hasPrice).toBe(false);
  });
});

describe("toContractPrices", () => {
  it("joins by iterating contracts and looking up quotes by id — extra quote keys are ignored", () => {
    // "413814809" mirrors the verified 208-vs-133 case: quotes carries a key
    // with no corresponding contract, and it must not surface as a row.
    const quotes: SmarketsQuotesResponse = {
      "399766485": LULA_QUOTE,
      "413814809": { bids: [], offers: [{ price: 667, quantity: 59_970 }] },
    };

    const prices = toContractPrices(["399766485", "399766486"], quotes);

    expect(prices).toHaveLength(2);
    expect(prices.map((p) => p.contractId)).toEqual(["399766485", "399766486"]);
    expect(prices[1]?.hasPrice).toBe(false); // no quote for 399766486
  });
});
