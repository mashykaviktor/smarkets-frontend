// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { smarketsRequest } from "@/server/smarkets/client";
import { isSmarketsApiError } from "@/server/smarkets/errors";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("smarketsRequest", () => {
  it("returns the parsed JSON body on a 2xx response", async () => {
    stubFetch(async () => jsonResponse(200, { ok: true }));

    await expect(smarketsRequest({ path: "/v3/popular/home/" })).resolves.toEqual({ ok: true });
  });

  it("returns undefined for a 204 response without reading a body", async () => {
    stubFetch(async () => new Response(null, { status: 204 }));

    await expect(smarketsRequest({ path: "/v3/sessions/", method: "DELETE" })).resolves.toBeUndefined();
  });

  it("attaches the session token as an Authorization header when given", async () => {
    let seenAuth: string | null = null;
    stubFetch(async (_input, init) => {
      seenAuth = (init?.headers as Record<string, string>).Authorization ?? null;
      return jsonResponse(200, {});
    });

    await smarketsRequest({ path: "/v3/popular/home/", token: "abc123" });

    expect(seenAuth).toBe("Session-Token abc123");
  });

  it("omits the Authorization header when no token is given", async () => {
    let sawAuth = false;
    stubFetch(async (_input, init) => {
      sawAuth = "Authorization" in (init?.headers as Record<string, string>);
      return jsonResponse(200, {});
    });

    await smarketsRequest({ path: "/v3/popular/home/" });

    expect(sawAuth).toBe(false);
  });

  it.each([400, 401, 404, 500])(
    "maps a %i response with the documented error envelope to a SmarketsApiError",
    async (status) => {
      stubFetch(async () => jsonResponse(status, { error_type: "SOME_ERROR", data: { detail: "x" } }));

      const result = await smarketsRequest({ path: "/v3/events/1/" }).catch((error: unknown) => error);

      expect(isSmarketsApiError(result)).toBe(true);
      if (!isSmarketsApiError(result)) throw result;
      expect(result.status).toBe(status);
      expect(result.errorType).toBe("SOME_ERROR");
      expect(result.data).toEqual({ detail: "x" });
    },
  );

  it("maps a non-JSON / non-envelope error body to a SmarketsApiError with a null errorType", async () => {
    stubFetch(async () => new Response("not json", { status: 500 }));

    const result = await smarketsRequest({ path: "/v3/events/1/" }).catch((error: unknown) => error);

    expect(isSmarketsApiError(result)).toBe(true);
    if (!isSmarketsApiError(result)) throw result;
    expect(result.status).toBe(500);
    expect(result.errorType).toBeNull();
    expect(result.message).toBe("Smarkets API error (500)");
  });

  it("maps a network failure (fetch rejecting) to a SmarketsApiError with status 0", async () => {
    stubFetch(async () => {
      throw new TypeError("fetch failed");
    });

    const result = await smarketsRequest({ path: "/v3/events/1/" }).catch((error: unknown) => error);

    expect(isSmarketsApiError(result)).toBe(true);
    if (!isSmarketsApiError(result)) throw result;
    expect(result.status).toBe(0);
    expect(result.errorType).toBeNull();
  });
});
