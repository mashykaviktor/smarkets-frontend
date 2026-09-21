/**
 * Presentation-only formatting. Domain values are never rounded before
 * this layer (see `domain/price.ts`) — rounding/truncation happens here,
 * once, right before rendering.
 */

/**
 * Decimal odds use fewer decimal places as the number grows, matching
 * common exchange convention: 1 decimal place at 100+ (extreme long
 * shots), 2 decimal places below that. Extreme-but-valid ticks are
 * formatted, never hidden: price 1 -> "10000.0", price 9999 -> "1.00".
 */
export function formatOdds(decimalOdds: number): string {
  const dp = decimalOdds >= 100 ? 1 : 2;
  return decimalOdds.toFixed(dp);
}

export function formatStake(gbp: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: gbp < 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(gbp);
}

const startDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatStartDate(iso: string | null): string {
  if (!iso) return "TBC";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "TBC";
  return startDateFormatter.format(date);
}
