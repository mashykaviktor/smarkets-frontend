import { NextResponse } from "next/server";
import { createSession, deleteSession } from "@/server/smarkets/endpoints";
import { isSmarketsApiError } from "@/server/smarkets/errors";
import { clearSessionToken, getSessionToken, setSessionToken } from "@/server/smarkets/session";

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

/** Explicit copy for the documented error_type values the login form can actually hit. */
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Incorrect email or password.",
  PASSWORD_RESET_NEEDED: "Your password needs to be reset on smarkets.com before you can sign in here.",
  RATE_LIMIT_EXCEEDED: "Too many login attempts — please wait a few minutes and try again.",
  CLIENT_JURISDICTION_MISMATCH: "Sign-in isn't available from your current location.",
  IP_NOT_TRUSTED: "This device or network isn't trusted for sign-in yet.",
};

function loginErrorMessage(errorType: string | null): string {
  return (errorType && LOGIN_ERROR_MESSAGES[errorType]) || "Sign-in failed. Please try again.";
}

export async function POST(request: Request) {
  const body: LoginBody = await request.json().catch(() => ({}));
  const { username, password } = body;

  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const session = await createSession({ username, password, remember: true });

    if (session.factor && session.factor !== "complete") {
      return NextResponse.json(
        {
          error:
            "This account has multi-factor authentication enabled, which is out of scope for this exercise.",
        },
        { status: 409 },
      );
    }

    if (!session.token) {
      return NextResponse.json({ error: loginErrorMessage(null) }, { status: 502 });
    }

    await setSessionToken(session.token);
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    if (isSmarketsApiError(error)) {
      return NextResponse.json(
        { error: loginErrorMessage(error.errorType) },
        { status: error.status || 502 },
      );
    }
    return NextResponse.json({ error: loginErrorMessage(null) }, { status: 500 });
  }
}

export async function DELETE() {
  const token = await getSessionToken();

  if (token) {
    try {
      await deleteSession({ token });
    } catch {
      // Clear the local cookie regardless — staying "signed in" locally
      // after a failed upstream logout is worse than a stray upstream
      // session that expires on its own within 30 minutes.
    }
  }

  await clearSessionToken();
  return NextResponse.json({ authenticated: false });
}

/** Never returns the token itself — only whether a session cookie is present. */
export async function GET() {
  const token = await getSessionToken();
  return NextResponse.json({ authenticated: Boolean(token) });
}
