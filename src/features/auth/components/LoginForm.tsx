"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiRequestError } from "@/lib/apiClient";
import { useLoginMutation } from "@/features/auth/queries";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLoginMutation();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate(
      { username, password },
      { onSuccess: () => router.push("/") },
    );
  }

  const errorMessage =
    login.error instanceof ApiRequestError ? (login.error.errorCode ?? login.error.message) : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="username"
          name="username"
          type="email"
          autoComplete="username"
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        />
      </div>
      {errorMessage && (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={login.isPending}
        className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        {login.isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
