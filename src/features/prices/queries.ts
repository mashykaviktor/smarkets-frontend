import { apiFetch } from "@/lib/apiClient";
import type { ContractPrice } from "@/domain/models";

export async function fetchPrices(
  marketIds: readonly string[],
  contractIds: readonly string[],
): Promise<ContractPrice[]> {
  const params = new URLSearchParams({
    marketIds: marketIds.join(","),
    contractIds: contractIds.join(","),
  });
  return apiFetch<ContractPrice[]>(`/api/smarkets/quotes?${params.toString()}`);
}
