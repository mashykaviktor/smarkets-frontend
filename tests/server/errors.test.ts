// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isSmarketsApiError, parseSmarketsErrorBody, SmarketsApiError } from "@/server/smarkets/errors";

describe("parseSmarketsErrorBody", () => {
  it("parses the documented { error_type, data } envelope", () => {
    expect(parseSmarketsErrorBody({ error_type: "EVENT_NOT_FOUND", data: { id: "1" } })).toEqual({
      error_type: "EVENT_NOT_FOUND",
      data: { id: "1" },
    });
  });

  it("accepts a missing data field as undefined", () => {
    expect(parseSmarketsErrorBody({ error_type: "INVALID_CREDENTIALS" })).toEqual({
      error_type: "INVALID_CREDENTIALS",
      data: undefined,
    });
  });

  it("returns null when error_type is missing", () => {
    expect(parseSmarketsErrorBody({ data: {} })).toBeNull();
  });

  it("returns null when error_type is not a string", () => {
    expect(parseSmarketsErrorBody({ error_type: 404 })).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(parseSmarketsErrorBody(null)).toBeNull();
    expect(parseSmarketsErrorBody("not an object")).toBeNull();
    expect(parseSmarketsErrorBody(undefined)).toBeNull();
  });
});

describe("isSmarketsApiError", () => {
  it("narrows SmarketsApiError instances", () => {
    const error = new SmarketsApiError("boom", 500, "SERVER_ERROR");
    expect(isSmarketsApiError(error)).toBe(true);
  });

  it("rejects other errors", () => {
    expect(isSmarketsApiError(new Error("boom"))).toBe(false);
    expect(isSmarketsApiError(null)).toBe(false);
  });
});
