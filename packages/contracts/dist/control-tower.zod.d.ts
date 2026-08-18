import { z } from "zod";
export declare const ListAlertsQuery: z.ZodObject<{
    severity: z.ZodOptional<z.ZodEnum<["INFO", "WARNING", "CRITICAL"]>>;
    category: z.ZodOptional<z.ZodEnum<["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "FREIGHT", "SYSTEM", "ACCOUNT", "MIXED_CONTAINER", "BULK_CONTAINER"]>>;
    workspaceId: z.ZodOptional<z.ZodString>;
    alertKey: z.ZodOptional<z.ZodString>;
    resolved: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    category?: "SYSTEM" | "MIXED_CONTAINER" | "BULK_CONTAINER" | "ORDER" | "SHIPMENT" | "FREIGHT" | "RFQ" | "COMMODITYBID" | "ACCOUNT" | undefined;
    workspaceId?: string | undefined;
    severity?: "INFO" | "WARNING" | "CRITICAL" | undefined;
    alertKey?: string | undefined;
    resolved?: "true" | "false" | undefined;
}, {
    category?: "SYSTEM" | "MIXED_CONTAINER" | "BULK_CONTAINER" | "ORDER" | "SHIPMENT" | "FREIGHT" | "RFQ" | "COMMODITYBID" | "ACCOUNT" | undefined;
    limit?: number | undefined;
    workspaceId?: string | undefined;
    offset?: number | undefined;
    severity?: "INFO" | "WARNING" | "CRITICAL" | undefined;
    alertKey?: string | undefined;
    resolved?: "true" | "false" | undefined;
}>;
export type ListAlertsQuery = z.infer<typeof ListAlertsQuery>;
export declare const ResolveAlertBody: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export type ResolveAlertBody = z.infer<typeof ResolveAlertBody>;
