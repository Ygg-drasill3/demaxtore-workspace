// apps/backend/src/lib/errors.ts
// Canonical error class — maps to the @dmx/contracts ApiError envelope.
import { ErrorCodes, type ErrorCode } from "@dmx/contracts";

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status  = status;
    this.code    = code;
    this.details = details;
  }
}

export const Unauthorized   = (msg = "Not authenticated") =>
  new HttpError(401, ErrorCodes.UNAUTHENTICATED, msg);
export const Forbidden      = (msg = "Forbidden") =>
  new HttpError(403, ErrorCodes.FORBIDDEN, msg);
export const NotFound       = (msg = "Not found") =>
  new HttpError(404, ErrorCodes.NOT_FOUND, msg);
export const Validation     = (msg: string, details?: Record<string, unknown>) =>
  new HttpError(400, ErrorCodes.VALIDATION_ERROR, msg, details);
export const Conflict       = (msg: string, details?: Record<string, unknown>) =>
  new HttpError(409, ErrorCodes.CONFLICT, msg, details);
export const InvalidCredentials = () =>
  new HttpError(401, ErrorCodes.UNAUTHENTICATED, "Invalid email or password");
export const TooManyRequests = (msg = "Too many requests") =>
  new HttpError(429, ErrorCodes.PRECONDITION_FAILED, msg);
