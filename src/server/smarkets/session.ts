import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "sm_session";
/** Matches the upstream token's own 30-minute expiry (spec: auto-renewed by any authenticated call). */
const COOKIE_MAX_AGE_SECONDS = 30 * 60;

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/**
 * `secure` is environment-conditional on purpose: hard-coding `true` would
 * silently break login on plain `http://localhost:3000` (the browser
 * refuses to store a Secure cookie over HTTP, with no visible error — the
 * session just never persists). Production keeps the flag.
 */
export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
