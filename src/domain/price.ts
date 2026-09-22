/**
 * Smarkets prices are percentage basis points (1-9999), not decimal odds.
 * This module is the only place that converts between the two — nothing
 * outside `domain/` or `features/prices/adapters.ts` should touch a raw
 * price or quantity value.
 */

export const MIN_PRICE_BP = 1;
export const MAX_PRICE_BP = 9999;

/**
 * decimalOdds = 10000 / priceBp. Returns null outside the exchange's valid
 * tick range (spec: minimum 1, maximum 9999) rather than an Infinity or a
 * clamped value — callers must treat that as "no price", not zero.
 */
export function toDecimalOdds(priceBp: number): number | null {
  if (!Number.isFinite(priceBp) || priceBp < MIN_PRICE_BP || priceBp > MAX_PRICE_BP) {
    return null;
  }
  return 10000 / priceBp;
}

/**
 * quantity is 1/100 of a UK penny. GBP value = quantity * priceBp /
 * 100_000_000 — the spec's own worked example: 100000 * 5000 / 100000000 =
 * £5. The API documents this quantity/price conversion the same way for
 * both `bids` and `offers` ticks, so callers apply it uniformly to back
 * and lay levels. The result is presented as available level depth, not
 * as the user's own stake or liability — see the "available amount" note
 * in README.md.
 */
export function toBackStake(quantity: number, priceBp: number): number {
  return (quantity * priceBp) / 100_000_000;
}
