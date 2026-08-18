import { z } from "zod";
/** Accepts ISO-8601 or `YYYY-MM-DDTHH:mm` from `<input type="datetime-local">`; outputs UTC ISO. */
export declare const DateTimeInput: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
