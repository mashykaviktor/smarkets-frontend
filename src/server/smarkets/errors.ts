/**
 * The Smarkets API returns the same error envelope — `{ error_type, data }`
 * — on every documented error response, across every endpoint (verified
 * against every error response in smarkets-openapi.json). `error_type`
 * varies per endpoint (e.g. `EVENT_NOT_FOUND` vs `INVALID_CREDENTIALS`), so
 * it is kept as `string` rather than one large cross-endpoint union.
 *
 * There is no separate error_type -> HTTP status table: the upstream HTTP
 * status *is* the correct status to react to (and to forward to the
 * browser from a route handler), so `SmarketsApiError.status` is read
 * directly off the upstream response rather than re-derived from
 * `error_type`.
 */
export interface SmarketsErrorBody {
  error_type: string;
  data: unknown;
}

export function parseSmarketsErrorBody(value: unknown): SmarketsErrorBody | null {
  if (typeof value !== "object" || value === null || !("error_type" in value)) {
    return null;
  }

  const errorType = (value as { error_type: unknown }).error_type;
  if (typeof errorType !== "string") {
    return null;
  }

  const data = "data" in value ? (value as { data: unknown }).data : undefined;
  return { error_type: errorType, data };
}

export class SmarketsApiError extends Error {
  /** Upstream HTTP status, or 0 when the request never reached the API. */
  readonly status: number;
  readonly errorType: string | null;
  readonly data: unknown;

  constructor(
    message: string,
    status: number,
    errorType: string | null,
    data?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SmarketsApiError";
    this.status = status;
    this.errorType = errorType;
    this.data = data;
  }
}

export function isSmarketsApiError(error: unknown): error is SmarketsApiError {
  return error instanceof SmarketsApiError;
}
