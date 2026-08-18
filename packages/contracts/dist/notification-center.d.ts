import { z } from "zod";
/** Operational event types surfaced in Notification Center. */
export declare const OperationalNotificationType: z.ZodEnum<["NEW_SUPPLIER_MESSAGE", "BUYER_MENTIONED", "SUPPLIER_MENTIONED", "ACTION_REQUIRED", "APPROVAL_REQUIRED", "QUOTATION_SUBMITTED", "QUOTATION_REVISED", "SUPPLIER_SELECTED", "COMMODITYBID_CLOSED", "PURCHASE_ORDER_ISSUED", "DOCUMENT_UPLOADED", "INSPECTION_SCHEDULED", "INSPECTION_COMPLETED", "SHIPMENT_BOOKED", "ETA_UPDATED", "SHIPMENT_DELAYED", "SHIPMENT_DELIVERED", "WORKSPACE_ASSIGNED"]>;
export type OperationalNotificationType = z.infer<typeof OperationalNotificationType>;
export declare const NotificationPriority: z.ZodEnum<["CRITICAL", "HIGH", "NORMAL", "INFORMATION"]>;
export type NotificationPriority = z.infer<typeof NotificationPriority>;
export declare const NotificationCategory: z.ZodEnum<["ALL", "UNREAD", "MESSAGES", "APPROVALS", "DOCUMENTS", "INSPECTION", "SHIPMENT", "WORKSPACE", "SYSTEM", "ARCHIVED"]>;
export type NotificationCategory = z.infer<typeof NotificationCategory>;
export declare const NotificationReadStatus: z.ZodEnum<["UNREAD", "READ", "ARCHIVED"]>;
export type NotificationReadStatus = z.infer<typeof NotificationReadStatus>;
export declare const NotificationActionType: z.ZodEnum<["OPEN_CONVERSATION", "OPEN_WORKSPACE", "OPEN_DOCUMENT", "OPEN_SHIPMENT", "OPEN_INSPECTION", "OPEN_PURCHASE_ORDER", "DISMISS", "MARK_READ"]>;
export type NotificationActionType = z.infer<typeof NotificationActionType>;
export declare const NotificationAction: z.ZodObject<{
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
}>;
export type NotificationAction = z.infer<typeof NotificationAction>;
export declare const SnoozeOption: z.ZodEnum<["FIFTEEN_MINUTES", "ONE_HOUR", "TOMORROW", "NEXT_WEEK"]>;
export type SnoozeOption = z.infer<typeof SnoozeOption>;
export declare const SnoozeNotificationBody: z.ZodObject<{
    option: z.ZodEnum<["FIFTEEN_MINUTES", "ONE_HOUR", "TOMORROW", "NEXT_WEEK"]>;
}, "strip", z.ZodTypeAny, {
    option: "FIFTEEN_MINUTES" | "ONE_HOUR" | "TOMORROW" | "NEXT_WEEK";
}, {
    option: "FIFTEEN_MINUTES" | "ONE_HOUR" | "TOMORROW" | "NEXT_WEEK";
}>;
export type SnoozeNotificationBody = z.infer<typeof SnoozeNotificationBody>;
/** Future delivery channels — architecture only (no external delivery in this sprint). */
export declare const DeliveryChannel: z.ZodEnum<["WORKSPACE", "EMAIL", "WHATSAPP", "PUSH"]>;
export type DeliveryChannel = z.infer<typeof DeliveryChannel>;
export declare const NotificationChannelPreference: z.ZodObject<{
    workspace: z.ZodDefault<z.ZodBoolean>;
    email: z.ZodDefault<z.ZodBoolean>;
    whatsapp: z.ZodDefault<z.ZodBoolean>;
    push: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    push: boolean;
    email: boolean;
    workspace: boolean;
    whatsapp: boolean;
}, {
    push?: boolean | undefined;
    email?: boolean | undefined;
    workspace?: boolean | undefined;
    whatsapp?: boolean | undefined;
}>;
export type NotificationChannelPreference = z.infer<typeof NotificationChannelPreference>;
export declare const NotificationTypePreference: z.ZodObject<{
    type: z.ZodEnum<["NEW_SUPPLIER_MESSAGE", "BUYER_MENTIONED", "SUPPLIER_MENTIONED", "ACTION_REQUIRED", "APPROVAL_REQUIRED", "QUOTATION_SUBMITTED", "QUOTATION_REVISED", "SUPPLIER_SELECTED", "COMMODITYBID_CLOSED", "PURCHASE_ORDER_ISSUED", "DOCUMENT_UPLOADED", "INSPECTION_SCHEDULED", "INSPECTION_COMPLETED", "SHIPMENT_BOOKED", "ETA_UPDATED", "SHIPMENT_DELAYED", "SHIPMENT_DELIVERED", "WORKSPACE_ASSIGNED"]>;
    channels: z.ZodObject<{
        workspace: z.ZodDefault<z.ZodBoolean>;
        email: z.ZodDefault<z.ZodBoolean>;
        whatsapp: z.ZodDefault<z.ZodBoolean>;
        push: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        push: boolean;
        email: boolean;
        workspace: boolean;
        whatsapp: boolean;
    }, {
        push?: boolean | undefined;
        email?: boolean | undefined;
        workspace?: boolean | undefined;
        whatsapp?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
    channels: {
        push: boolean;
        email: boolean;
        workspace: boolean;
        whatsapp: boolean;
    };
}, {
    type: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
    channels: {
        push?: boolean | undefined;
        email?: boolean | undefined;
        workspace?: boolean | undefined;
        whatsapp?: boolean | undefined;
    };
}>;
export type NotificationTypePreference = z.infer<typeof NotificationTypePreference>;
export declare const NotificationPreferences: z.ZodObject<{
    types: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["NEW_SUPPLIER_MESSAGE", "BUYER_MENTIONED", "SUPPLIER_MENTIONED", "ACTION_REQUIRED", "APPROVAL_REQUIRED", "QUOTATION_SUBMITTED", "QUOTATION_REVISED", "SUPPLIER_SELECTED", "COMMODITYBID_CLOSED", "PURCHASE_ORDER_ISSUED", "DOCUMENT_UPLOADED", "INSPECTION_SCHEDULED", "INSPECTION_COMPLETED", "SHIPMENT_BOOKED", "ETA_UPDATED", "SHIPMENT_DELAYED", "SHIPMENT_DELIVERED", "WORKSPACE_ASSIGNED"]>;
        channels: z.ZodObject<{
            workspace: z.ZodDefault<z.ZodBoolean>;
            email: z.ZodDefault<z.ZodBoolean>;
            whatsapp: z.ZodDefault<z.ZodBoolean>;
            push: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            push: boolean;
            email: boolean;
            workspace: boolean;
            whatsapp: boolean;
        }, {
            push?: boolean | undefined;
            email?: boolean | undefined;
            workspace?: boolean | undefined;
            whatsapp?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
        channels: {
            push: boolean;
            email: boolean;
            workspace: boolean;
            whatsapp: boolean;
        };
    }, {
        type: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
        channels: {
            push?: boolean | undefined;
            email?: boolean | undefined;
            workspace?: boolean | undefined;
            whatsapp?: boolean | undefined;
        };
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    types: {
        type: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
        channels: {
            push: boolean;
            email: boolean;
            workspace: boolean;
            whatsapp: boolean;
        };
    }[];
}, {
    types: {
        type: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
        channels: {
            push?: boolean | undefined;
            email?: boolean | undefined;
            workspace?: boolean | undefined;
            whatsapp?: boolean | undefined;
        };
    }[];
}>;
export type NotificationPreferences = z.infer<typeof NotificationPreferences>;
export declare const NotificationCenterDTO: z.ZodObject<{
    id: z.ZodString;
    /** Legacy visual severity (INFO / SUCCESS / WARNING / ERROR). */
    type: z.ZodEnum<["INFO", "SUCCESS", "WARNING", "ERROR"]>;
    centerType: z.ZodEnum<["NEW_SUPPLIER_MESSAGE", "BUYER_MENTIONED", "SUPPLIER_MENTIONED", "ACTION_REQUIRED", "APPROVAL_REQUIRED", "QUOTATION_SUBMITTED", "QUOTATION_REVISED", "SUPPLIER_SELECTED", "COMMODITYBID_CLOSED", "PURCHASE_ORDER_ISSUED", "DOCUMENT_UPLOADED", "INSPECTION_SCHEDULED", "INSPECTION_COMPLETED", "SHIPMENT_BOOKED", "ETA_UPDATED", "SHIPMENT_DELAYED", "SHIPMENT_DELIVERED", "WORKSPACE_ASSIGNED"]>;
    priority: z.ZodEnum<["CRITICAL", "HIGH", "NORMAL", "INFORMATION"]>;
    category: z.ZodEnum<["MESSAGES", "APPROVALS", "DOCUMENTS", "INSPECTION", "SHIPMENT", "WORKSPACE", "SYSTEM"]>;
    titleKey: z.ZodString;
    title: z.ZodString;
    body: z.ZodNullable<z.ZodString>;
    link: z.ZodNullable<z.ZodString>;
    workspaceId: z.ZodNullable<z.ZodString>;
    workspaceType: z.ZodNullable<z.ZodEnum<["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "PO", "FREIGHTIQ"]>>;
    workspaceRef: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["UNREAD", "READ", "ARCHIVED"]>;
    read: z.ZodBoolean;
    readAt: z.ZodNullable<z.ZodString>;
    snoozedUntil: z.ZodNullable<z.ZodString>;
    actions: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
    status: "READ" | "UNREAD" | "ARCHIVED";
    id: string;
    createdAt: string;
    category: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE";
    workspaceId: string | null;
    title: string;
    body: string | null;
    workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
    priority: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION";
    centerType: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
    titleKey: string;
    link: string | null;
    workspaceRef: string | null;
    read: boolean;
    readAt: string | null;
    snoozedUntil: string | null;
    actions: {
        type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
        label: string;
        href?: string | undefined;
    }[];
}, {
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
    status: "READ" | "UNREAD" | "ARCHIVED";
    id: string;
    createdAt: string;
    category: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE";
    workspaceId: string | null;
    title: string;
    body: string | null;
    workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
    priority: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION";
    centerType: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
    titleKey: string;
    link: string | null;
    workspaceRef: string | null;
    read: boolean;
    readAt: string | null;
    snoozedUntil: string | null;
    actions: {
        type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
        label: string;
        href?: string | undefined;
    }[];
}>;
export type NotificationCenterDTO = z.infer<typeof NotificationCenterDTO>;
export declare const ListNotificationCenterQuery: z.ZodObject<{
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
export type ListNotificationCenterQuery = z.infer<typeof ListNotificationCenterQuery>;
export declare const NotificationCenterListResponse: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        /** Legacy visual severity (INFO / SUCCESS / WARNING / ERROR). */
        type: z.ZodEnum<["INFO", "SUCCESS", "WARNING", "ERROR"]>;
        centerType: z.ZodEnum<["NEW_SUPPLIER_MESSAGE", "BUYER_MENTIONED", "SUPPLIER_MENTIONED", "ACTION_REQUIRED", "APPROVAL_REQUIRED", "QUOTATION_SUBMITTED", "QUOTATION_REVISED", "SUPPLIER_SELECTED", "COMMODITYBID_CLOSED", "PURCHASE_ORDER_ISSUED", "DOCUMENT_UPLOADED", "INSPECTION_SCHEDULED", "INSPECTION_COMPLETED", "SHIPMENT_BOOKED", "ETA_UPDATED", "SHIPMENT_DELAYED", "SHIPMENT_DELIVERED", "WORKSPACE_ASSIGNED"]>;
        priority: z.ZodEnum<["CRITICAL", "HIGH", "NORMAL", "INFORMATION"]>;
        category: z.ZodEnum<["MESSAGES", "APPROVALS", "DOCUMENTS", "INSPECTION", "SHIPMENT", "WORKSPACE", "SYSTEM"]>;
        titleKey: z.ZodString;
        title: z.ZodString;
        body: z.ZodNullable<z.ZodString>;
        link: z.ZodNullable<z.ZodString>;
        workspaceId: z.ZodNullable<z.ZodString>;
        workspaceType: z.ZodNullable<z.ZodEnum<["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "PO", "FREIGHTIQ"]>>;
        workspaceRef: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["UNREAD", "READ", "ARCHIVED"]>;
        read: z.ZodBoolean;
        readAt: z.ZodNullable<z.ZodString>;
        snoozedUntil: z.ZodNullable<z.ZodString>;
        actions: z.ZodArray<z.ZodObject<{
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
        }>, "many">;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
        status: "READ" | "UNREAD" | "ARCHIVED";
        id: string;
        createdAt: string;
        category: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE";
        workspaceId: string | null;
        title: string;
        body: string | null;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
        priority: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION";
        centerType: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
        titleKey: string;
        link: string | null;
        workspaceRef: string | null;
        read: boolean;
        readAt: string | null;
        snoozedUntil: string | null;
        actions: {
            type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
            label: string;
            href?: string | undefined;
        }[];
    }, {
        type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
        status: "READ" | "UNREAD" | "ARCHIVED";
        id: string;
        createdAt: string;
        category: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE";
        workspaceId: string | null;
        title: string;
        body: string | null;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
        priority: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION";
        centerType: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
        titleKey: string;
        link: string | null;
        workspaceRef: string | null;
        read: boolean;
        readAt: string | null;
        snoozedUntil: string | null;
        actions: {
            type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
            label: string;
            href?: string | undefined;
        }[];
    }>, "many">;
    unreadCount: z.ZodNumber;
    nextCursor: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    items: {
        type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
        status: "READ" | "UNREAD" | "ARCHIVED";
        id: string;
        createdAt: string;
        category: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE";
        workspaceId: string | null;
        title: string;
        body: string | null;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
        priority: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION";
        centerType: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
        titleKey: string;
        link: string | null;
        workspaceRef: string | null;
        read: boolean;
        readAt: string | null;
        snoozedUntil: string | null;
        actions: {
            type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
            label: string;
            href?: string | undefined;
        }[];
    }[];
    unreadCount: number;
    nextCursor: string | null;
}, {
    items: {
        type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
        status: "READ" | "UNREAD" | "ARCHIVED";
        id: string;
        createdAt: string;
        category: "SYSTEM" | "SHIPMENT" | "INSPECTION" | "MESSAGES" | "APPROVALS" | "DOCUMENTS" | "WORKSPACE";
        workspaceId: string | null;
        title: string;
        body: string | null;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ" | null;
        priority: "CRITICAL" | "HIGH" | "NORMAL" | "INFORMATION";
        centerType: "ACTION_REQUIRED" | "QUOTATION_SUBMITTED" | "SUPPLIER_SELECTED" | "COMMODITYBID_CLOSED" | "PURCHASE_ORDER_ISSUED" | "INSPECTION_SCHEDULED" | "SHIPMENT_BOOKED" | "ETA_UPDATED" | "SHIPMENT_DELIVERED" | "NEW_SUPPLIER_MESSAGE" | "BUYER_MENTIONED" | "SUPPLIER_MENTIONED" | "APPROVAL_REQUIRED" | "QUOTATION_REVISED" | "DOCUMENT_UPLOADED" | "INSPECTION_COMPLETED" | "SHIPMENT_DELAYED" | "WORKSPACE_ASSIGNED";
        titleKey: string;
        link: string | null;
        workspaceRef: string | null;
        read: boolean;
        readAt: string | null;
        snoozedUntil: string | null;
        actions: {
            type: "OPEN_CONVERSATION" | "OPEN_WORKSPACE" | "OPEN_DOCUMENT" | "OPEN_SHIPMENT" | "OPEN_INSPECTION" | "OPEN_PURCHASE_ORDER" | "DISMISS" | "MARK_READ";
            label: string;
            href?: string | undefined;
        }[];
    }[];
    unreadCount: number;
    nextCursor: string | null;
}>;
export type NotificationCenterListResponse = z.infer<typeof NotificationCenterListResponse>;
