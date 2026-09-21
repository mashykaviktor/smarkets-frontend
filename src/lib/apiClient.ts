export class ApiRequestError extends Error {
  readonly status: number;
  readonly errorCode?: string;

  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

interface ErrorBody {
  error?: string;
}

/** Client-side fetch helper for this app's own /api/smarkets/* routes. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);

  if (!response.ok) {
    const body: ErrorBody | null = await response.json().catch(() => null);
    throw new ApiRequestError(
      body?.error ? `Request failed: ${body.error}` : `Request failed (${response.status})`,
      response.status,
      body?.error,
    );
  }

  return (await response.json()) as T;
}
