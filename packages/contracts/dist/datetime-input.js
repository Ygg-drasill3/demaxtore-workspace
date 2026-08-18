// Shared deadline/date fields for HTML datetime-local and ISO-8601 API payloads.
import { z } from "zod";
/** Accepts ISO-8601 or `YYYY-MM-DDTHH:mm` from `<input type="datetime-local">`; outputs UTC ISO. */
export const DateTimeInput = z
    .string()
    .min(1, "Date/time is required")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Invalid date/time" })
    .transform((v) => new Date(v).toISOString());
