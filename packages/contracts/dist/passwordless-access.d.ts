import { z } from "zod";
export declare const PasswordlessAccessTtl: z.ZodEnum<["FIFTEEN_MINUTES", "THIRTY_MINUTES", "ONE_HOUR", "TWENTY_FOUR_HOURS"]>;
export type PasswordlessAccessTtl = z.infer<typeof PasswordlessAccessTtl>;
export declare const CreatePasswordlessLinkInput: z.ZodObject<{
    userId: z.ZodString;
    workspaceType: z.ZodEnum<["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "PO", "FREIGHTIQ"]>;
    workspaceId: z.ZodString;
    ttl: z.ZodDefault<z.ZodEnum<["FIFTEEN_MINUTES", "THIRTY_MINUTES", "ONE_HOUR", "TWENTY_FOUR_HOURS"]>>;
    singleUse: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ";
    userId: string;
    ttl: "FIFTEEN_MINUTES" | "ONE_HOUR" | "THIRTY_MINUTES" | "TWENTY_FOUR_HOURS";
    singleUse: boolean;
}, {
    workspaceId: string;
    workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ";
    userId: string;
    ttl?: "FIFTEEN_MINUTES" | "ONE_HOUR" | "THIRTY_MINUTES" | "TWENTY_FOUR_HOURS" | undefined;
    singleUse?: boolean | undefined;
}>;
export type CreatePasswordlessLinkInput = z.infer<typeof CreatePasswordlessLinkInput>;
export declare const CreatePasswordlessLinkResponse: z.ZodObject<{
    accessUrl: z.ZodString;
    expiresAt: z.ZodString;
    conversationId: z.ZodString;
    tokenId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    expiresAt: string;
    accessUrl: string;
    conversationId: string;
    tokenId: string;
}, {
    expiresAt: string;
    accessUrl: string;
    conversationId: string;
    tokenId: string;
}>;
export type CreatePasswordlessLinkResponse = z.infer<typeof CreatePasswordlessLinkResponse>;
export declare const ConsumePasswordlessAccessInput: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type ConsumePasswordlessAccessInput = z.infer<typeof ConsumePasswordlessAccessInput>;
export declare const PasswordlessScope: z.ZodObject<{
    workspaceType: z.ZodEnum<["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "PO", "FREIGHTIQ"]>;
    workspaceId: z.ZodString;
    conversationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    workspaceId: string;
    workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ";
    conversationId: string;
}, {
    workspaceId: string;
    workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ";
    conversationId: string;
}>;
export type PasswordlessScope = z.infer<typeof PasswordlessScope>;
export declare const ConsumePasswordlessAccessResponse: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        displayName: z.ZodString;
        role: z.ZodEnum<["BUYER", "SUPPLIER", "ADMIN", "SALES_CONTROL", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "FINANCE_OPERATOR", "DOCUMENT_CONTROLLER", "FORWARDER", "ORIGIN_AGENT", "TRUCKER", "CUSTOMS_BROKER"]>;
        organisation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phoneNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phoneVerificationStatus: z.ZodOptional<z.ZodNullable<z.ZodEnum<["PENDING_PHONE_VERIFICATION", "PHONE_VERIFIED", "PHONE_REJECTED"]>>>;
        createdAt: z.ZodString;
        buyerOperatingModel: z.ZodOptional<z.ZodEnum<["INTERNATIONAL", "TURKEY_IMPORTER"]>>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
        createdAt: string;
        organisation?: string | null | undefined;
        avatarUrl?: string | null | undefined;
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: "PENDING_PHONE_VERIFICATION" | "PHONE_VERIFIED" | "PHONE_REJECTED" | null | undefined;
        buyerOperatingModel?: "INTERNATIONAL" | "TURKEY_IMPORTER" | undefined;
    }, {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
        createdAt: string;
        organisation?: string | null | undefined;
        avatarUrl?: string | null | undefined;
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: "PENDING_PHONE_VERIFICATION" | "PHONE_VERIFIED" | "PHONE_REJECTED" | null | undefined;
        buyerOperatingModel?: "INTERNATIONAL" | "TURKEY_IMPORTER" | undefined;
    }>;
    accessToken: z.ZodString;
    expiresInSec: z.ZodNumber;
    accessMode: z.ZodLiteral<"passwordless">;
    scope: z.ZodObject<{
        workspaceType: z.ZodEnum<["RFQ", "COMMODITYBID", "ORDER", "SHIPMENT", "PO", "FREIGHTIQ"]>;
        workspaceId: z.ZodString;
        conversationId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        workspaceId: string;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ";
        conversationId: string;
    }, {
        workspaceId: string;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ";
        conversationId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    user: {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
        createdAt: string;
        organisation?: string | null | undefined;
        avatarUrl?: string | null | undefined;
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: "PENDING_PHONE_VERIFICATION" | "PHONE_VERIFIED" | "PHONE_REJECTED" | null | undefined;
        buyerOperatingModel?: "INTERNATIONAL" | "TURKEY_IMPORTER" | undefined;
    };
    accessToken: string;
    expiresInSec: number;
    scope: {
        workspaceId: string;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ";
        conversationId: string;
    };
    accessMode: "passwordless";
}, {
    user: {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
        createdAt: string;
        organisation?: string | null | undefined;
        avatarUrl?: string | null | undefined;
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: "PENDING_PHONE_VERIFICATION" | "PHONE_VERIFIED" | "PHONE_REJECTED" | null | undefined;
        buyerOperatingModel?: "INTERNATIONAL" | "TURKEY_IMPORTER" | undefined;
    };
    accessToken: string;
    expiresInSec: number;
    scope: {
        workspaceId: string;
        workspaceType: "ORDER" | "SHIPMENT" | "PO" | "RFQ" | "COMMODITYBID" | "FREIGHTIQ";
        conversationId: string;
    };
    accessMode: "passwordless";
}>;
export type ConsumePasswordlessAccessResponse = z.infer<typeof ConsumePasswordlessAccessResponse>;
