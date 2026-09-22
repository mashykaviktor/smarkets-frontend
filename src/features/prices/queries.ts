import { apiFetch } from "@/lib/apiClient";
import type { ContractPrice } from "@/domain/models";

/**
 * POST, not GET: the event page's contract list is uncapped, so a query
 * string risks the header-size ceiling most servers enforce for a large
 * event. See the route handler's own comment for the full rationale.
 */
export async function fetchPrices(
  marketIds: readonly string[],
  contractIds: readonly string[],
): Promise<ContractPrice[]> {
  return apiFetch<ContractPrice[]>("/api/smarkets/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marketIds, contractIds }),
  });
}
