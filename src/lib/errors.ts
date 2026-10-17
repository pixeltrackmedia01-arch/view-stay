export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "HOLD_EXPIRED"
  | "PAYMENT_FAILED"
  | "PRICE_CHANGED"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  HOLD_EXPIRED: 410,
  PAYMENT_FAILED: 402,
  PRICE_CHANGED: 409,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    /** Safe, client-facing extra data (never internals). */
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
