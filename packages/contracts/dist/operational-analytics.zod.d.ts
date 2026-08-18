import { z } from "zod";
export declare const AnalyticsFilterQuerySchema: z.ZodEffects<z.ZodObject<{
    preset: z.ZodDefault<z.ZodOptional<z.ZodEnum<["TODAY", "LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "CUSTOM"]>>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    preset: "CUSTOM" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH";
    from?: string | undefined;
    to?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
    preset?: "CUSTOM" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | undefined;
}>, {
    preset: "CUSTOM" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH";
    from?: string | undefined;
    to?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
    preset?: "CUSTOM" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | undefined;
}>;
export type AnalyticsFilterQuery = z.infer<typeof AnalyticsFilterQuerySchema>;
export declare const AnalyticsExportQuerySchema: z.ZodEffects<z.ZodObject<{
    preset: z.ZodDefault<z.ZodOptional<z.ZodEnum<["TODAY", "LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "CUSTOM"]>>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
} & {
    format: z.ZodDefault<z.ZodOptional<z.ZodEnum<["csv", "xlsx"]>>>;
    scope: z.ZodDefault<z.ZodOptional<z.ZodEnum<["summary", "orders", "shipments", "inspections", "tasks", "issues", "completion", "suppliers"]>>>;
}, "strict", z.ZodTypeAny, {
    scope: "issues" | "summary" | "shipments" | "inspections" | "orders" | "tasks" | "completion" | "suppliers";
    preset: "CUSTOM" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH";
    format: "csv" | "xlsx";
    from?: string | undefined;
    to?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
    scope?: "issues" | "summary" | "shipments" | "inspections" | "orders" | "tasks" | "completion" | "suppliers" | undefined;
    preset?: "CUSTOM" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | undefined;
    format?: "csv" | "xlsx" | undefined;
}>, {
    scope: "issues" | "summary" | "shipments" | "inspections" | "orders" | "tasks" | "completion" | "suppliers";
    preset: "CUSTOM" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH";
    format: "csv" | "xlsx";
    from?: string | undefined;
    to?: string | undefined;
}, {
    from?: string | undefined;
    to?: string | undefined;
    scope?: "issues" | "summary" | "shipments" | "inspections" | "orders" | "tasks" | "completion" | "suppliers" | undefined;
    preset?: "CUSTOM" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | undefined;
    format?: "csv" | "xlsx" | undefined;
}>;
export type AnalyticsExportQuery = z.infer<typeof AnalyticsExportQuerySchema>;
