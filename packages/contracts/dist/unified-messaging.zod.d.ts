import { z } from "zod";
export declare const ConversationListFiltersSchema: z.ZodObject<{
    channel: z.ZodOptional<z.ZodEnum<["WORKSPACE", "WHATSAPP", "SYSTEM"]>>;
    contextType: z.ZodOptional<z.ZodEnum<["GENERAL", "RFQ", "QUOTATION", "PURCHASE_ORDER", "ORDER", "SHIPMENT", "FREIGHT", "FREIGHT_REQUEST", "FREIGHTIQ", "COMMODITY_BID", "SMART_CONTAINER", "BULK_CONTAINER", "FULL_CONTAINER", "INSPECTION", "DOCUMENT", "SUPPORT", "WHATSAPP"]>>;
    contextId: z.ZodOptional<z.ZodString>;
    participantId: z.ZodOptional<z.ZodString>;
    companyId: z.ZodOptional<z.ZodString>;
    assignedUserId: z.ZodOptional<z.ZodString>;
    unread: z.ZodOptional<z.ZodBoolean>;
    archived: z.ZodOptional<z.ZodBoolean>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "ARCHIVED", "CLOSED"]>>;
    search: z.ZodOptional<z.ZodString>;
    before: z.ZodOptional<z.ZodString>;
    after: z.ZodOptional<z.ZodString>;
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    status?: "ACTIVE" | "CLOSED" | "ARCHIVED" | undefined;
    search?: string | undefined;
    cursor?: string | undefined;
    channel?: "SYSTEM" | "WORKSPACE" | "WHATSAPP" | undefined;
    unread?: boolean | undefined;
    archived?: boolean | undefined;
    contextType?: "BULK_CONTAINER" | "ORDER" | "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "INSPECTION" | "RFQ" | "FREIGHTIQ" | "DOCUMENT" | "QUOTATION" | "WHATSAPP" | "COMMODITY_BID" | "GENERAL" | "FREIGHT_REQUEST" | "SMART_CONTAINER" | "FULL_CONTAINER" | "SUPPORT" | undefined;
    contextId?: string | undefined;
    participantId?: string | undefined;
    companyId?: string | undefined;
    assignedUserId?: string | undefined;
    before?: string | undefined;
    after?: string | undefined;
}, {
    status?: "ACTIVE" | "CLOSED" | "ARCHIVED" | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    cursor?: string | undefined;
    channel?: "SYSTEM" | "WORKSPACE" | "WHATSAPP" | undefined;
    unread?: boolean | undefined;
    archived?: boolean | undefined;
    contextType?: "BULK_CONTAINER" | "ORDER" | "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "INSPECTION" | "RFQ" | "FREIGHTIQ" | "DOCUMENT" | "QUOTATION" | "WHATSAPP" | "COMMODITY_BID" | "GENERAL" | "FREIGHT_REQUEST" | "SMART_CONTAINER" | "FULL_CONTAINER" | "SUPPORT" | undefined;
    contextId?: string | undefined;
    participantId?: string | undefined;
    companyId?: string | undefined;
    assignedUserId?: string | undefined;
    before?: string | undefined;
    after?: string | undefined;
}>;
export declare const CreateConversationRequestSchema: z.ZodObject<{
    subject: z.ZodOptional<z.ZodString>;
    primaryChannel: z.ZodOptional<z.ZodEnum<["WORKSPACE", "WHATSAPP", "SYSTEM"]>>;
    priority: z.ZodOptional<z.ZodEnum<["LOW", "NORMAL", "HIGH", "URGENT"]>>;
    workspaceType: z.ZodOptional<z.ZodString>;
    workspaceId: z.ZodOptional<z.ZodString>;
    contexts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        contextType: z.ZodEnum<["GENERAL", "RFQ", "QUOTATION", "PURCHASE_ORDER", "ORDER", "SHIPMENT", "FREIGHT", "FREIGHT_REQUEST", "FREIGHTIQ", "COMMODITY_BID", "SMART_CONTAINER", "BULK_CONTAINER", "FULL_CONTAINER", "INSPECTION", "DOCUMENT", "SUPPORT", "WHATSAPP"]>;
        contextId: z.ZodString;
        contextReference: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        contextType: "BULK_CONTAINER" | "ORDER" | "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "INSPECTION" | "RFQ" | "FREIGHTIQ" | "DOCUMENT" | "QUOTATION" | "WHATSAPP" | "COMMODITY_BID" | "GENERAL" | "FREIGHT_REQUEST" | "SMART_CONTAINER" | "FULL_CONTAINER" | "SUPPORT";
        contextId: string;
        contextReference?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, {
        contextType: "BULK_CONTAINER" | "ORDER" | "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "INSPECTION" | "RFQ" | "FREIGHTIQ" | "DOCUMENT" | "QUOTATION" | "WHATSAPP" | "COMMODITY_BID" | "GENERAL" | "FREIGHT_REQUEST" | "SMART_CONTAINER" | "FULL_CONTAINER" | "SUPPORT";
        contextId: string;
        contextReference?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">>;
    participants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        userId: z.ZodOptional<z.ZodString>;
        whatsappContactId: z.ZodOptional<z.ZodString>;
        participantType: z.ZodEnum<["USER", "WHATSAPP_CONTACT", "SYSTEM"]>;
        participantRole: z.ZodOptional<z.ZodString>;
        displayName: z.ZodOptional<z.ZodString>;
        phoneE164: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        companyId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        participantType: "SYSTEM" | "USER" | "WHATSAPP_CONTACT";
        email?: string | undefined;
        displayName?: string | undefined;
        userId?: string | undefined;
        companyId?: string | undefined;
        whatsappContactId?: string | undefined;
        participantRole?: string | undefined;
        phoneE164?: string | undefined;
    }, {
        participantType: "SYSTEM" | "USER" | "WHATSAPP_CONTACT";
        email?: string | undefined;
        displayName?: string | undefined;
        userId?: string | undefined;
        companyId?: string | undefined;
        whatsappContactId?: string | undefined;
        participantRole?: string | undefined;
        phoneE164?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    workspaceId?: string | undefined;
    workspaceType?: string | undefined;
    priority?: "LOW" | "HIGH" | "NORMAL" | "URGENT" | undefined;
    subject?: string | undefined;
    primaryChannel?: "SYSTEM" | "WORKSPACE" | "WHATSAPP" | undefined;
    contexts?: {
        contextType: "BULK_CONTAINER" | "ORDER" | "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "INSPECTION" | "RFQ" | "FREIGHTIQ" | "DOCUMENT" | "QUOTATION" | "WHATSAPP" | "COMMODITY_BID" | "GENERAL" | "FREIGHT_REQUEST" | "SMART_CONTAINER" | "FULL_CONTAINER" | "SUPPORT";
        contextId: string;
        contextReference?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[] | undefined;
    participants?: {
        participantType: "SYSTEM" | "USER" | "WHATSAPP_CONTACT";
        email?: string | undefined;
        displayName?: string | undefined;
        userId?: string | undefined;
        companyId?: string | undefined;
        whatsappContactId?: string | undefined;
        participantRole?: string | undefined;
        phoneE164?: string | undefined;
    }[] | undefined;
}, {
    workspaceId?: string | undefined;
    workspaceType?: string | undefined;
    priority?: "LOW" | "HIGH" | "NORMAL" | "URGENT" | undefined;
    subject?: string | undefined;
    primaryChannel?: "SYSTEM" | "WORKSPACE" | "WHATSAPP" | undefined;
    contexts?: {
        contextType: "BULK_CONTAINER" | "ORDER" | "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "INSPECTION" | "RFQ" | "FREIGHTIQ" | "DOCUMENT" | "QUOTATION" | "WHATSAPP" | "COMMODITY_BID" | "GENERAL" | "FREIGHT_REQUEST" | "SMART_CONTAINER" | "FULL_CONTAINER" | "SUPPORT";
        contextId: string;
        contextReference?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[] | undefined;
    participants?: {
        participantType: "SYSTEM" | "USER" | "WHATSAPP_CONTACT";
        email?: string | undefined;
        displayName?: string | undefined;
        userId?: string | undefined;
        companyId?: string | undefined;
        whatsappContactId?: string | undefined;
        participantRole?: string | undefined;
        phoneE164?: string | undefined;
    }[] | undefined;
}>;
export declare const CreateMessageRequestSchema: z.ZodObject<{
    body: z.ZodString;
    messageType: z.ZodOptional<z.ZodString>;
    channel: z.ZodOptional<z.ZodEnum<["WORKSPACE", "WHATSAPP", "SYSTEM"]>>;
    replyToMessageId: z.ZodOptional<z.ZodString>;
    clientMessageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    body: string;
    clientMessageId?: string | undefined;
    channel?: "SYSTEM" | "WORKSPACE" | "WHATSAPP" | undefined;
    replyToMessageId?: string | undefined;
    messageType?: string | undefined;
}, {
    body: string;
    clientMessageId?: string | undefined;
    channel?: "SYSTEM" | "WORKSPACE" | "WHATSAPP" | undefined;
    replyToMessageId?: string | undefined;
    messageType?: string | undefined;
}>;
export declare const CreateInternalNoteRequestSchema: z.ZodObject<{
    body: z.ZodString;
    replyToMessageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    body: string;
    replyToMessageId?: string | undefined;
}, {
    body: string;
    replyToMessageId?: string | undefined;
}>;
export declare const AssignConversationRequestSchema: z.ZodObject<{
    assignedUserId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    assignedUserId: string;
}, {
    assignedUserId: string;
}>;
export declare const AddContextRequestSchema: z.ZodObject<{
    contextType: z.ZodEnum<["GENERAL", "RFQ", "QUOTATION", "PURCHASE_ORDER", "ORDER", "SHIPMENT", "FREIGHT", "FREIGHT_REQUEST", "FREIGHTIQ", "COMMODITY_BID", "SMART_CONTAINER", "BULK_CONTAINER", "FULL_CONTAINER", "INSPECTION", "DOCUMENT", "SUPPORT", "WHATSAPP"]>;
    contextId: z.ZodString;
    contextReference: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    contextType: "BULK_CONTAINER" | "ORDER" | "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "INSPECTION" | "RFQ" | "FREIGHTIQ" | "DOCUMENT" | "QUOTATION" | "WHATSAPP" | "COMMODITY_BID" | "GENERAL" | "FREIGHT_REQUEST" | "SMART_CONTAINER" | "FULL_CONTAINER" | "SUPPORT";
    contextId: string;
    contextReference?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    contextType: "BULK_CONTAINER" | "ORDER" | "SHIPMENT" | "FREIGHT" | "PURCHASE_ORDER" | "INSPECTION" | "RFQ" | "FREIGHTIQ" | "DOCUMENT" | "QUOTATION" | "WHATSAPP" | "COMMODITY_BID" | "GENERAL" | "FREIGHT_REQUEST" | "SMART_CONTAINER" | "FULL_CONTAINER" | "SUPPORT";
    contextId: string;
    contextReference?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const UpdatePriorityRequestSchema: z.ZodObject<{
    priority: z.ZodEnum<["LOW", "NORMAL", "HIGH", "URGENT"]>;
}, "strip", z.ZodTypeAny, {
    priority: "LOW" | "HIGH" | "NORMAL" | "URGENT";
}, {
    priority: "LOW" | "HIGH" | "NORMAL" | "URGENT";
}>;
export declare const UpdateStatusRequestSchema: z.ZodObject<{
    status: z.ZodEnum<["ACTIVE", "ARCHIVED", "CLOSED"]>;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "CLOSED" | "ARCHIVED";
}, {
    status: "ACTIVE" | "CLOSED" | "ARCHIVED";
}>;
export declare const AddParticipantRequestSchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    whatsappContactId: z.ZodOptional<z.ZodString>;
    participantType: z.ZodEnum<["USER", "WHATSAPP_CONTACT", "SYSTEM"]>;
    participantRole: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
    phoneE164: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    companyId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    participantType: "SYSTEM" | "USER" | "WHATSAPP_CONTACT";
    email?: string | undefined;
    displayName?: string | undefined;
    userId?: string | undefined;
    companyId?: string | undefined;
    whatsappContactId?: string | undefined;
    participantRole?: string | undefined;
    phoneE164?: string | undefined;
}, {
    participantType: "SYSTEM" | "USER" | "WHATSAPP_CONTACT";
    email?: string | undefined;
    displayName?: string | undefined;
    userId?: string | undefined;
    companyId?: string | undefined;
    whatsappContactId?: string | undefined;
    participantRole?: string | undefined;
    phoneE164?: string | undefined;
}>;
export declare const MessageListQuerySchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
}, {
    limit?: number | undefined;
    cursor?: string | undefined;
}>;
