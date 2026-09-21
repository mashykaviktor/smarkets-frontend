import { QueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "./apiClient";

/** Client (4xx) errors won't resolve on retry — e.g. a 404 for a real not-found event. Only retry network/5xx failures. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiRequestError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 3;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
    },
  });
}
