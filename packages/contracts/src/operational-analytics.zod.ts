import { z } from "zod";
import {
  ANALYTICS_EXPORT_FORMATS,
  ANALYTICS_EXPORT_SCOPES,
  ANALYTICS_TIME_PRESETS,
} from "./operational-analytics";

const AnalyticsFilterObjectSchema = z
  .object({
    preset: z.enum(ANALYTICS_TIME_PRESETS).optional().default("LAST_30_DAYS"),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();

function refineCustomRange<T extends { preset: string; from?: string; to?: string }>(
  val: T,
  ctx: z.RefinementCtx,
) {
  if (val.preset === "CUSTOM") {
    if (!val.from || !val.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom range requires from and to ISO datetimes",
      });
    }
  }
}

export const AnalyticsFilterQuerySchema = AnalyticsFilterObjectSchema.superRefine(refineCustomRange);
export type AnalyticsFilterQuery = z.infer<typeof AnalyticsFilterQuerySchema>;

export const AnalyticsExportQuerySchema = AnalyticsFilterObjectSchema.extend({
  format: z.enum(ANALYTICS_EXPORT_FORMATS).optional().default("csv"),
  scope: z.enum(ANALYTICS_EXPORT_SCOPES).optional().default("summary"),
})
  .strict()
  .superRefine(refineCustomRange);
export type AnalyticsExportQuery = z.infer<typeof AnalyticsExportQuerySchema>;
