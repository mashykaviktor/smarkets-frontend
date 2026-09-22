import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import type { HomeResponse } from "./types";

export function useHomeQuery() {
  return useQuery({
    queryKey: ["home"],
    queryFn: () => apiFetch<HomeResponse>("/api/smarkets/home"),
    staleTime: 5 * 60 * 1000,
  });
}
