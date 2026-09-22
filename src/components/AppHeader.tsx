"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useLogoutMutation, useSessionQuery } from "@/features/auth/queries";

export function AppHeader() {
  const { data } = useSessionQuery();
  const logout = useLogoutMutation();
  const authenticated = data?.authenticated ?? false;

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Smarkets
        </Link>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              authenticated ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${authenticated ? "bg-emerald-500" : "bg-zinc-400"}`}
              aria-hidden="true"
            />
            {authenticated ? "Live prices" : "Delayed prices"}
          </span>

          {authenticated ? (
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="inline-flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-zinc-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
