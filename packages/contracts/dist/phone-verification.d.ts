import { z } from "zod";
export declare const PhoneVerificationStatusEnum: z.ZodEnum<["PENDING_PHONE_VERIFICATION", "PHONE_VERIFIED", "PHONE_REJECTED"]>;
export type PhoneVerificationStatus = z.infer<typeof PhoneVerificationStatusEnum>;
export declare const PhoneVerificationRequestStatusEnum: z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>;
export declare const SubmitPhoneInput: z.ZodObject<{
    phone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
}, {
    phone: string;
}>;
export type SubmitPhoneInput = z.infer<typeof SubmitPhoneInput>;
export declare const PhoneVerificationRequestDto: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    phone: z.ZodString;
    status: z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    submittedAt: z.ZodString;
    approvedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    rejectedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    user: z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        email: z.ZodString;
        role: z.ZodEnum<["BUYER", "SUPPLIER", "ADMIN", "SALES_CONTROL", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "FINANCE_OPERATOR", "DOCUMENT_CONTROLLER", "FORWARDER", "ORIGIN_AGENT", "TRUCKER", "CUSTOMS_BROKER"]>;
        organisation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
        organisation?: string | null | undefined;
    }, {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
        organisation?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    phone: string;
    id: string;
    user: {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
        organisation?: string | null | undefined;
    };
    submittedAt: string;
    userId: string;
    notes?: string | null | undefined;
    approvedAt?: string | null | undefined;
    rejectedAt?: string | null | undefined;
}, {
    status: "PENDING" | "APPROVED" | "REJECTED";
    phone: string;
    id: string;
    user: {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
        organisation?: string | null | undefined;
    };
    submittedAt: string;
    userId: string;
    notes?: string | null | undefined;
    approvedAt?: string | null | undefined;
    rejectedAt?: string | null | undefined;
}>;
export type PhoneVerificationRequestDto = z.infer<typeof PhoneVerificationRequestDto>;
export declare const PhoneVerificationQueueResponse: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        phone: z.ZodString;
        status: z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        submittedAt: z.ZodString;
        approvedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        rejectedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        user: z.ZodObject<{
            id: z.ZodString;
            displayName: z.ZodString;
            email: z.ZodString;
            role: z.ZodEnum<["BUYER", "SUPPLIER", "ADMIN", "SALES_CONTROL", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "FINANCE_OPERATOR", "DOCUMENT_CONTROLLER", "FORWARDER", "ORIGIN_AGENT", "TRUCKER", "CUSTOMS_BROKER"]>;
            organisation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        }, {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        status: "PENDING" | "APPROVED" | "REJECTED";
        phone: string;
        id: string;
        user: {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        };
        submittedAt: string;
        userId: string;
        notes?: string | null | undefined;
        approvedAt?: string | null | undefined;
        rejectedAt?: string | null | undefined;
    }, {
        status: "PENDING" | "APPROVED" | "REJECTED";
        phone: string;
        id: string;
        user: {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        };
        submittedAt: string;
        userId: string;
        notes?: string | null | undefined;
        approvedAt?: string | null | undefined;
        rejectedAt?: string | null | undefined;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    items: {
        status: "PENDING" | "APPROVED" | "REJECTED";
        phone: string;
        id: string;
        user: {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        };
        submittedAt: string;
        userId: string;
        notes?: string | null | undefined;
        approvedAt?: string | null | undefined;
        rejectedAt?: string | null | undefined;
    }[];
    total: number;
}, {
    items: {
        status: "PENDING" | "APPROVED" | "REJECTED";
        phone: string;
        id: string;
        user: {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        };
        submittedAt: string;
        userId: string;
        notes?: string | null | undefined;
        approvedAt?: string | null | undefined;
        rejectedAt?: string | null | undefined;
    }[];
    total: number;
}>;
export type PhoneVerificationQueueResponse = z.infer<typeof PhoneVerificationQueueResponse>;
export declare const ReviewPhoneInput: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
}, {
    notes?: string | undefined;
}>;
export type ReviewPhoneInput = z.infer<typeof ReviewPhoneInput>;
export declare const PhoneVerificationMeResponse: z.ZodObject<{
    phoneNumber: z.ZodNullable<z.ZodString>;
    phoneVerificationStatus: z.ZodNullable<z.ZodEnum<["PENDING_PHONE_VERIFICATION", "PHONE_VERIFIED", "PHONE_REJECTED"]>>;
    canMessage: z.ZodBoolean;
    pendingRequest: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        phone: z.ZodString;
        status: z.ZodEnum<["PENDING", "APPROVED", "REJECTED"]>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        submittedAt: z.ZodString;
        approvedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        rejectedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        user: z.ZodObject<{
            id: z.ZodString;
            displayName: z.ZodString;
            email: z.ZodString;
            role: z.ZodEnum<["BUYER", "SUPPLIER", "ADMIN", "SALES_CONTROL", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "FINANCE_OPERATOR", "DOCUMENT_CONTROLLER", "FORWARDER", "ORIGIN_AGENT", "TRUCKER", "CUSTOMS_BROKER"]>;
            organisation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        }, {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        status: "PENDING" | "APPROVED" | "REJECTED";
        phone: string;
        id: string;
        user: {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        };
        submittedAt: string;
        userId: string;
        notes?: string | null | undefined;
        approvedAt?: string | null | undefined;
        rejectedAt?: string | null | undefined;
    }, {
        status: "PENDING" | "APPROVED" | "REJECTED";
        phone: string;
        id: string;
        user: {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        };
        submittedAt: string;
        userId: string;
        notes?: string | null | undefined;
        approvedAt?: string | null | undefined;
        rejectedAt?: string | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    phoneNumber: string | null;
    phoneVerificationStatus: "PENDING_PHONE_VERIFICATION" | "PHONE_VERIFIED" | "PHONE_REJECTED" | null;
    canMessage: boolean;
    pendingRequest?: {
        status: "PENDING" | "APPROVED" | "REJECTED";
        phone: string;
        id: string;
        user: {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        };
        submittedAt: string;
        userId: string;
        notes?: string | null | undefined;
        approvedAt?: string | null | undefined;
        rejectedAt?: string | null | undefined;
    } | null | undefined;
}, {
    phoneNumber: string | null;
    phoneVerificationStatus: "PENDING_PHONE_VERIFICATION" | "PHONE_VERIFIED" | "PHONE_REJECTED" | null;
    canMessage: boolean;
    pendingRequest?: {
        status: "PENDING" | "APPROVED" | "REJECTED";
        phone: string;
        id: string;
        user: {
            email: string;
            displayName: string;
            id: string;
            role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
            organisation?: string | null | undefined;
        };
        submittedAt: string;
        userId: string;
        notes?: string | null | undefined;
        approvedAt?: string | null | undefined;
        rejectedAt?: string | null | undefined;
    } | null | undefined;
}>;
export type PhoneVerificationMeResponse = z.infer<typeof PhoneVerificationMeResponse>;
