import { describe, expect, it } from "vitest";
import { MAX_PRICE_BP, MIN_PRICE_BP, toBackStake, toDecimalOdds } from "@/domain/price";

describe("toDecimalOdds", () => {
  it("converts basis points to decimal odds", () => {
    expect(toDecimalOdds(5000)).toBe(2.0);
    expect(toDecimalOdds(6667)).toBeCloseTo(1.5, 3);
  });

  it("accepts the boundary ticks (1 and 9999) as valid, not filtered", () => {
    expect(toDecimalOdds(1)).toBe(10000);
    expect(toDecimalOdds(9999)).toBeCloseTo(1.0001, 4);
  });

  it("returns null outside the valid tick range, never a rounded/clamped value", () => {
    expect(toDecimalOdds(0)).toBeNull();
    expect(toDecimalOdds(-5000)).toBeNull();
    expect(toDecimalOdds(10000)).toBeNull();
    expect(toDecimalOdds(Number.NaN)).toBeNull();
  });

  it("never rounds before dividing", () => {
    // 10000 / 3 is not a clean number; asserting the raw quotient (not a
    // pre-rounded one) is what protects against rounding creeping into the
    // domain layer instead of the display layer.
    expect(toDecimalOdds(3)).toBe(10000 / 3);
  });

  it("exposes the verified valid range as constants", () => {
    expect(MIN_PRICE_BP).toBe(1);
    expect(MAX_PRICE_BP).toBe(9999);
  });
});

describe("toBackStake", () => {
  it("matches the spec's own worked example: 100000 * 5000 / 100000000 = £5", () => {
    expect(toBackStake(100_000, 5000)).toBe(5);
  });

  it("returns 0 stake for 0 quantity", () => {
    expect(toBackStake(0, 5000)).toBe(0);
  });
});
