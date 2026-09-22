"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import type { SessionStatus } from "./types";

export function useSessionQuery() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => apiFetch<SessionStatus>("/api/smarkets/session"),
    staleTime: 60 * 1000,
  });
}

interface LoginCredentials {
  username: string;
  password: string;
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      apiFetch<SessionStatus>("/api/smarkets/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["session"], data);
      // Login upgrades quotes from delayed to live — re-poll immediately.
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiFetch<SessionStatus>("/api/smarkets/session", { method: "DELETE" }),
    onSuccess: (data) => {
      queryClient.setQueryData(["session"], data);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}
