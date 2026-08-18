import { z } from "zod";
/** Canonical error envelope returned by Express error middleware. */
export declare const ApiError: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    }, {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    };
}, {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown> | undefined;
    };
}>;
export type ApiError = z.infer<typeof ApiError>;
/** Standard cursor-paginated list response. */
export interface CursorPage<T> {
    items: T[];
    nextCursor: string | null;
}
/** Concrete error codes (kept in sync with backend service errors). */
export declare const ErrorCodes: {
    readonly INVALID_TRANSITION: "INVALID_TRANSITION";
    readonly PRECONDITION_FAILED: "PRECONDITION_FAILED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly UNAUTHENTICATED: "UNAUTHENTICATED";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly CONFLICT: "CONFLICT";
    readonly IDEMPOTENCY_REPLAY: "IDEMPOTENCY_REPLAY";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly INTERNAL: "INTERNAL";
    readonly REFERENCE_FREIGHT_NOT_FOUND: "REFERENCE_FREIGHT_NOT_FOUND";
    readonly FREIGHT_ESTIMATE_REQUIRED: "FREIGHT_ESTIMATE_REQUIRED";
    readonly REFERENCE_FREIGHT_OVERLAP: "REFERENCE_FREIGHT_OVERLAP";
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
