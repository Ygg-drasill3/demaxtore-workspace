// =============================================================================
// @dmx/contracts — API envelope, error shape, pagination
// =============================================================================
import { z } from "zod";

/** Canonical error envelope returned by Express error middleware. */
export const ApiError = z.object({
  error: z.object({
    code:    z.string(),    // e.g. "INVALID_TRANSITION", "FORBIDDEN", "VALIDATION_ERROR"
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

/** Standard cursor-paginated list response. */
export interface CursorPage<T> {
  items:      T[];
  nextCursor: string | null;
}

/** Concrete error codes (kept in sync with backend service errors). */
export const ErrorCodes = {
  INVALID_TRANSITION:   "INVALID_TRANSITION",
  PRECONDITION_FAILED:  "PRECONDITION_FAILED",
  FORBIDDEN:            "FORBIDDEN",
  UNAUTHENTICATED:      "UNAUTHENTICATED",
  VALIDATION_ERROR:     "VALIDATION_ERROR",
  NOT_FOUND:            "NOT_FOUND",
  CONFLICT:             "CONFLICT",
  IDEMPOTENCY_REPLAY:   "IDEMPOTENCY_REPLAY",
  INTERNAL:             "INTERNAL",
  REFERENCE_FREIGHT_NOT_FOUND: "REFERENCE_FREIGHT_NOT_FOUND",
  FREIGHT_ESTIMATE_REQUIRED: "FREIGHT_ESTIMATE_REQUIRED",
  REFERENCE_FREIGHT_OVERLAP: "REFERENCE_FREIGHT_OVERLAP",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
