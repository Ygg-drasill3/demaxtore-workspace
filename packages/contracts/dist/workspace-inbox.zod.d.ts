import { z } from "zod";
export declare const WorkspaceInboxQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    filter: z.ZodOptional<z.ZodEnum<["all", "rfq", "commoditybid", "purchase_orders", "shipments", "completed", "waiting_for_me", "unread", "delayed", "archived"]>>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    filter?: "completed" | "all" | "rfq" | "commoditybid" | "purchase_orders" | "shipments" | "waiting_for_me" | "unread" | "delayed" | "archived" | undefined;
    q?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}, {
    filter?: "completed" | "all" | "rfq" | "commoditybid" | "purchase_orders" | "shipments" | "waiting_for_me" | "unread" | "delayed" | "archived" | undefined;
    q?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export type WorkspaceInboxQueryInput = z.infer<typeof WorkspaceInboxQuerySchema>;
