import "server-only";
import { SmarketsApiError, parseSmarketsErrorBody } from "./errors";

const DEFAULT_TIMEOUT_MS = 10_000;

function getBaseUrl(): string {
  return process.env.SMARKETS_API_BASE_URL ?? "https://api.smarkets.com";
}

export interface SmarketsRequestOptions {
  /** Path only, e.g. "/v3/popular/home/" — resolved against the API base URL. */
  path: string;
  method?: "GET" | "POST" | "DELETE";
  searchParams?: URLSearchParams;
  body?: unknown;
  /** Session token to send as `Authorization: Session-Token <token>`. */
  token?: string | null;
  /** Next.js ISR revalidation window, in seconds. Ignored if `cache` is set. */
  revalidateSeconds?: number;
  /** Set to "no-store" for endpoints that must never be cached (quotes). */
  cache?: "no-store";
  signal?: AbortSignal;
}

/**
 * Thin fetch wrapper: resolves the base URL, attaches the session token and
 * JSON headers, applies a request timeout, and turns non-2xx responses into
 * a {@link SmarketsApiError}. Server-only — never bundle into client JS.
 */
export async function smarketsRequest<T>(options: SmarketsRequestOptions): Promise<T> {
  const {
    path,
    method = "GET",
    searchParams,
    body,
    token,
    revalidateSeconds,
    cache,
    signal,
  } = options;

  const url = new URL(path, getBaseUrl());
  if (searchParams) {
    for (const [key, value] of searchParams) {
      url.searchParams.append(key, value);
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Session-Token ${token}`;
  }

  const timeoutSignal = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: requestSignal,
      ...(cache === "no-store"
        ? { cache: "no-store" as const }
        : revalidateSeconds !== undefined
          ? { next: { revalidate: revalidateSeconds } }
          : {}),
    });
  } catch (cause) {
    throw new SmarketsApiError("Failed to reach the Smarkets API", 0, null, undefined, { cause });
  }

  if (!response.ok) {
    const errorJson: unknown = await response.json().catch(() => null);
    const parsed = parseSmarketsErrorBody(errorJson);
    throw new SmarketsApiError(
      parsed ? `Smarkets API error: ${parsed.error_type}` : `Smarkets API error (${response.status})`,
      response.status,
      parsed?.error_type ?? null,
      parsed?.data,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
