import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import type { EventPageResponse } from "./types";

export function useEventQuery(eventId: string) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: () => apiFetch<EventPageResponse>(`/api/smarkets/events/${eventId}`),
    staleTime: 5 * 60 * 1000,
  });
}
