// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildQuery,
  chunk,
  CONTRACT_MARKET_IDS_MAX,
  EVENT_IDS_MAX,
  MARKET_EVENT_IDS_MAX,
  QUOTE_MARKET_IDS_MAX,
} from "@/server/smarkets/endpoints";

describe("buildQuery", () => {
  it("serialises array params as repeated keys, not comma-joined", () => {
    const search = buildQuery({ parent_id: ["a", "b", "c"] });

    expect(search.toString()).toBe("parent_id=a&parent_id=b&parent_id=c");
    expect(search.getAll("parent_id")).toEqual(["a", "b", "c"]);
  });

  it("serialises scalar params as a single key", () => {
    const search = buildQuery({ with_new_type: true, limit: 50 });

    expect(search.get("with_new_type")).toBe("true");
    expect(search.get("limit")).toBe("50");
  });

  it("omits undefined params entirely", () => {
    const search = buildQuery({ limit_by_event: undefined });

    expect(search.has("limit_by_event")).toBe(false);
    expect(search.toString()).toBe("");
  });
});

describe("chunk", () => {
  it("splits at the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns no chunks for an empty input", () => {
    expect(chunk([], 100)).toEqual([]);
  });

  it("returns a single chunk when input is within the size", () => {
    expect(chunk([1, 2, 3], 100)).toEqual([[1, 2, 3]]);
  });

  it("matches the verified batch caps", () => {
    expect(EVENT_IDS_MAX).toBe(300);
    expect(MARKET_EVENT_IDS_MAX).toBe(50);
    expect(CONTRACT_MARKET_IDS_MAX).toBe(100);
    expect(QUOTE_MARKET_IDS_MAX).toBe(200);
  });
});
