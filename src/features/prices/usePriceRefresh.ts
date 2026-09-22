"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiRequestError } from "@/lib/apiClient";
import { fetchPrices } from "./queries";

const NORMAL_INTERVAL_MS = 5_000;
const THROTTLED_INTERVAL_MS = 30_000;

function isRateLimited(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 429;
}

/**
 * Polls /api/smarkets/quotes for every market currently on screen. One
 * logical refresh, chunked server-side, never per-market. Backs off to
 * 30s and reports `isThrottled` on a 429 instead of continuing to hammer
 * the endpoint; TanStack Query's `refetchIntervalInBackground: false`
 * already pauses polling in hidden tabs, and `keepPreviousData` keeps the
 * last known prices on screen through every refetch (including a 429)
 * instead of collapsing to a loading state.
 */
export function usePriceRefresh(marketIds: readonly string[], contractIds: readonly string[]) {
  const sortedMarketIds = [...marketIds].sort();

  const query = useQuery({
    queryKey: ["quotes", sortedMarketIds],
    queryFn: () => fetchPrices(marketIds, contractIds),
    enabled: marketIds.length > 0 && contractIds.length > 0,
    staleTime: 0,
    placeholderData: keepPreviousData,
    refetchIntervalInBackground: false,
    refetchInterval: (q) => (isRateLimited(q.state.error) ? THROTTLED_INTERVAL_MS : NORMAL_INTERVAL_MS),
  });

  return {
    prices: query.data,
    isThrottled: isRateLimited(query.error),
    dataUpdatedAt: query.dataUpdatedAt,
  };
}
