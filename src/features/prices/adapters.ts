import { toBackStake, toDecimalOdds } from "@/domain/price";
import type { ContractPrice, Side } from "@/domain/models";
import type {
  SmarketsQuote,
  SmarketsQuoteLevel,
  SmarketsQuotesResponse,
} from "@/server/smarkets/types";

function bestLevel(
  levels: readonly SmarketsQuoteLevel[],
  pick: "lowest" | "highest",
): SmarketsQuoteLevel | null {
  if (levels.length === 0) {
    return null;
  }
  return levels.reduce((best, level) =>
    (pick === "lowest" ? level.price < best.price : level.price > best.price) ? level : best,
  );
}

function toSide(level: SmarketsQuoteLevel | null): Side | null {
  if (level === null) {
    return null;
  }
  const decimalOdds = toDecimalOdds(level.price);
  if (decimalOdds === null) {
    return null;
  }
  return {
    decimalOdds,
    priceBp: level.price,
    stake: toBackStake(level.quantity, level.price),
  };
}

/**
 * Converts one contract's raw quote into the domain `ContractPrice`.
 *
 * Best back = lowest `offers` price, best lay = highest `bids` price — this
 * is verified by overround (summed best offers across a market ≈126.8%,
 * summed best bids ≈97.4%), not assumed from the `side: buy`/`sell` naming,
 * which is the single easiest thing to get backwards here.
 *
 * A missing quote (contract absent from the quotes response) and an empty
 * `bids`/`offers` array both resolve to `hasPrice: false` — contracts with
 * no liquidity at all are common (39% in the verified sample), not an edge
 * case.
 */
export function toContractPrice(
  contractId: string,
  quote: SmarketsQuote | undefined,
): ContractPrice {
  const back = toSide(bestLevel(quote?.offers ?? [], "lowest"));
  const lay = toSide(bestLevel(quote?.bids ?? [], "highest"));

  return {
    contractId,
    back,
    lay,
    hasPrice: back !== null || lay !== null,
  };
}

/**
 * Joins contracts to quotes by iterating CONTRACTS and looking up each
 * quote by contract id — never the reverse. Quotes can include keys for
 * contracts absent from the contracts endpoint (verified: 208 quote keys
 * vs 133 contracts for the same 19 markets); iterating quote keys would
 * surface those as nameless rows.
 */
export function toContractPrices(
  contractIds: readonly string[],
  quotes: SmarketsQuotesResponse,
): ContractPrice[] {
  return contractIds.map((contractId) => toContractPrice(contractId, quotes[contractId]));
}
