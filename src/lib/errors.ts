export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "HOLD_EXPIRED"
  | "PAYMENT_FAILED";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  HOLD_EXPIRED: 410,
  PAYMENT_FAILED: 402,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
