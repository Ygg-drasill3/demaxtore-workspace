import { z } from "zod";
export declare const NotificationType: z.ZodEnum<["INFO", "SUCCESS", "WARNING", "ERROR"]>;
export type NotificationType = z.infer<typeof NotificationType>;
export declare const NotificationDTO: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["INFO", "SUCCESS", "WARNING", "ERROR"]>;
    /** i18n key from FSM NotifySpec.titleKey (e.g. "rfq.submitted.admin"). */
    titleKey: z.ZodString;
    /** Hydrated title for current locale — computed server-side. */
    title: z.ZodString;
    body: z.ZodNullable<z.ZodString>;
    /** Workspace deep-link (e.g. "/workspace/rfq/<id>"). */
    link: z.ZodNullable<z.ZodString>;
    workspaceId: z.ZodNullable<z.ZodString>;
    workspaceType: z.ZodNullable<z.ZodEnum<["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "PO", "FREIGHTIQ"]>>;
    workspaceRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    read: z.ZodBoolean;
    readAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    centerType: z.ZodOptional<z.ZodEnum<["NEW_SUPPLIER_MESSAGE", "BUYER_MENTIONED", "SUPPLIER_MENTIONED", "ACTION_REQUIRED", "APPROVAL_REQUIRED", "QUOTATION_SUBMITTED", "QUOTATION_REVISED", "SUPPLIER_SELECTED", "COMMODITYBID_CLOSED", "PURCHASE_ORDER_ISSUED", "DOCUMENT_UPLOADED", "INSPECTION_SCHEDULED", "INSPECTION_COMPLETED", "SHIPMENT_BOOKED", "ETA_UPDATED", "SHIPMENT_DELAYED", "SHIPMENT_DELIVERED", "WORKSPACE_ASSIGNED"]>>;
    priority: z.ZodOptional<z.ZodEnum<["CRITICAL", "HIGH", "NORMAL", "INFORMATION"]>>;
    category: z.ZodOptional<z.ZodEnum<["MESSAGES", "APPROVALS", "DOCUMENTS", "INSPECTION", "SHIPMENT", "WORKSPACE", "SYSTEM", "ARCHIVED"]>>;
    status: z.ZodOptional<z.ZodEnum<["UNREAD", "READ", "ARCHIVED"]>>;
    snoozedUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    actions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["OPEN_CONVERSATION", "OPEN_WORKSPACE", "OPEN_DOCUMENT", "OPEN_SHIPMENT", "OPEN_INSPECTION", "OPEN_PURCHASE_ORDER", "DISMISS", "MARK_READ"]>;
        label: z.ZodString;
        href: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
        label: string;
        href?: string | undefined;
    }, {
        type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
        label: string;
        href?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
    id: string;
    createdAt: string;
    workspaceId: string | null;
    title: string;
    body: string | null;
    workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
    titleKey: string;
    link: string | null;
    read: boolean;
    readAt: string | null;
    status?: "READ" | "UNREAD" | "ARCHIVED" | undefined;
    category?: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE" | "ARCHIVED" | undefined;
    priority?: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION" | undefined;
    centerType?: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED" | undefined;
    workspaceRef?: string | null | undefined;
    snoozedUntil?: string | null | undefined;
    actions?: {
        type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
        label: string;
        href?: string | undefined;
    }[] | undefined;
}, {
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
    id: string;
    createdAt: string;
    workspaceId: string | null;
    title: string;
    body: string | null;
    workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
    titleKey: string;
    link: string | null;
    read: boolean;
    readAt: string | null;
    status?: "READ" | "UNREAD" | "ARCHIVED" | undefined;
    category?: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE" | "ARCHIVED" | undefined;
    priority?: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION" | undefined;
    centerType?: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED" | undefined;
    workspaceRef?: string | null | undefined;
    snoozedUntil?: string | null | undefined;
    actions?: {
        type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
        label: string;
        href?: string | undefined;
    }[] | undefined;
}>;
export type NotificationDTO = z.infer<typeof NotificationDTO>;
export declare const ListNotificationsQuery: z.ZodObject<{
    category: z.ZodDefault<z.ZodEnum<["ALL", "UNREAD", "MESSAGES", "APPROVALS", "DOCUMENTS", "INSPECTION", "SHIPMENT", "WORKSPACE", "SYSTEM", "ARCHIVED"]>>;
    unreadOnly: z.ZodDefault<z.ZodBoolean>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    category: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "ALL" | "UNREAD" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE" | "ARCHIVED";
    limit: number;
    unreadOnly: boolean;
    cursor?: string | undefined;
}, {
    category?: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "ALL" | "UNREAD" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE" | "ARCHIVED" | undefined;
    limit?: number | undefined;
    unreadOnly?: boolean | undefined;
    cursor?: string | undefined;
}>;
export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuery>;
export declare const NotificationListResponse: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["INFO", "SUCCESS", "WARNING", "ERROR"]>;
        /** i18n key from FSM NotifySpec.titleKey (e.g. "rfq.submitted.admin"). */
        titleKey: z.ZodString;
        /** Hydrated title for current locale — computed server-side. */
        title: z.ZodString;
        body: z.ZodNullable<z.ZodString>;
        /** Workspace deep-link (e.g. "/workspace/rfq/<id>"). */
        link: z.ZodNullable<z.ZodString>;
        workspaceId: z.ZodNullable<z.ZodString>;
        workspaceType: z.ZodNullable<z.ZodEnum<["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "PO", "FREIGHTIQ"]>>;
        workspaceRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        read: z.ZodBoolean;
        readAt: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        centerType: z.ZodOptional<z.ZodEnum<["NEW_SUPPLIER_MESSAGE", "BUYER_MENTIONED", "SUPPLIER_MENTIONED", "ACTION_REQUIRED", "APPROVAL_REQUIRED", "QUOTATION_SUBMITTED", "QUOTATION_REVISED", "SUPPLIER_SELECTED", "COMMODITYBID_CLOSED", "PURCHASE_ORDER_ISSUED", "DOCUMENT_UPLOADED", "INSPECTION_SCHEDULED", "INSPECTION_COMPLETED", "SHIPMENT_BOOKED", "ETA_UPDATED", "SHIPMENT_DELAYED", "SHIPMENT_DELIVERED", "WORKSPACE_ASSIGNED"]>>;
        priority: z.ZodOptional<z.ZodEnum<["CRITICAL", "HIGH", "NORMAL", "INFORMATION"]>>;
        category: z.ZodOptional<z.ZodEnum<["MESSAGES", "APPROVALS", "DOCUMENTS", "INSPECTION", "SHIPMENT", "WORKSPACE", "SYSTEM", "ARCHIVED"]>>;
        status: z.ZodOptional<z.ZodEnum<["UNREAD", "READ", "ARCHIVED"]>>;
        snoozedUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        actions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["OPEN_CONVERSATION", "OPEN_WORKSPACE", "OPEN_DOCUMENT", "OPEN_SHIPMENT", "OPEN_INSPECTION", "OPEN_PURCHASE_ORDER", "DISMISS", "MARK_READ"]>;
            label: z.ZodString;
            href: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
            label: string;
            href?: string | undefined;
        }, {
            type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
            label: string;
            href?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
        id: string;
        createdAt: string;
        workspaceId: string | null;
        title: string;
        body: string | null;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
        titleKey: string;
        link: string | null;
        read: boolean;
        readAt: string | null;
        status?: "READ" | "UNREAD" | "ARCHIVED" | undefined;
        category?: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE" | "ARCHIVED" | undefined;
        priority?: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION" | undefined;
        centerType?: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED" | undefined;
        workspaceRef?: string | null | undefined;
        snoozedUntil?: string | null | undefined;
        actions?: {
            type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
            label: string;
            href?: string | undefined;
        }[] | undefined;
    }, {
        type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
        id: string;
        createdAt: string;
        workspaceId: string | null;
        title: string;
        body: string | null;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
        titleKey: string;
        link: string | null;
        read: boolean;
        readAt: string | null;
        status?: "READ" | "UNREAD" | "ARCHIVED" | undefined;
        category?: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE" | "ARCHIVED" | undefined;
        priority?: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION" | undefined;
        centerType?: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED" | undefined;
        workspaceRef?: string | null | undefined;
        snoozedUntil?: string | null | undefined;
        actions?: {
            type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
            label: string;
            href?: string | undefined;
        }[] | undefined;
    }>, "many">;
    unreadCount: z.ZodNumber;
    nextCursor: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    items: {
        type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
        id: string;
        createdAt: string;
        workspaceId: string | null;
        title: string;
        body: string | null;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
        titleKey: string;
        link: string | null;
        read: boolean;
        readAt: string | null;
        status?: "READ" | "UNREAD" | "ARCHIVED" | undefined;
        category?: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE" | "ARCHIVED" | undefined;
        priority?: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION" | undefined;
        centerType?: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED" | undefined;
        workspaceRef?: string | null | undefined;
        snoozedUntil?: string | null | undefined;
        actions?: {
            type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
            label: string;
            href?: string | undefined;
        }[] | undefined;
    }[];
    unreadCount: number;
    nextCursor: string | null;
}, {
    items: {
        type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
        id: string;
        createdAt: string;
        workspaceId: string | null;
        title: string;
        body: string | null;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
        titleKey: string;
        link: string | null;
        read: boolean;
        readAt: string | null;
        status?: "READ" | "UNREAD" | "ARCHIVED" | undefined;
        category?: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE" | "ARCHIVED" | undefined;
        priority?: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION" | undefined;
        centerType?: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED" | undefined;
        workspaceRef?: string | null | undefined;
        snoozedUntil?: string | null | undefined;
        actions?: {
            type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
            label: string;
            href?: string | undefined;
        }[] | undefined;
    }[];
    unreadCount: number;
    nextCursor: string | null;
}>;
export type NotificationListResponse = z.infer<typeof NotificationListResponse>;
export * from "./notification-center.js";
