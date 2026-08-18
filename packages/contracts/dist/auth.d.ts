import { z } from "zod";
export type Role = "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SUPER_ADMIN" | "OPS_MANAGER" | "LOGISTICS_OPERATOR" | "FINANCE_OPERATOR" | "DOCUMENT_CONTROLLER" | "FORWARDER" | "ORIGIN_AGENT" | "TRUCKER" | "CUSTOMS_BROKER";
export declare const RoleEnum: z.ZodEnum<["BUYER", "SUPPLIER", "ADMIN", "SALES_CONTROL", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "FINANCE_OPERATOR", "DOCUMENT_CONTROLLER", "FORWARDER", "ORIGIN_AGENT", "TRUCKER", "CUSTOMS_BROKER"]>;
export declare const LoginInput: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof LoginInput>;
export declare const ForgotPasswordInput: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInput>;
export declare const ResetPasswordInput: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;
export declare const RegisterInput: z.ZodObject<{
    displayName: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    organisationName: z.ZodString;
    phone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    displayName: string;
    organisationName: string;
    phone: string;
}, {
    email: string;
    password: string;
    displayName: string;
    organisationName: string;
    phone: string;
}>;
export type RegisterInput = z.infer<typeof RegisterInput>;
export declare const UserDTO: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodString;
    role: z.ZodEnum<["BUYER", "SUPPLIER", "ADMIN", "SALES_CONTROL", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "FINANCE_OPERATOR", "DOCUMENT_CONTROLLER", "FORWARDER", "ORIGIN_AGENT", "TRUCKER", "CUSTOMS_BROKER"]>;
    organisation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phoneNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phoneVerificationStatus: z.ZodOptional<z.ZodNullable<z.ZodEnum<["PENDING_PHONE_VERIFICATION", "PHONE_VERIFIED", "PHONE_REJECTED"]>>>;
    createdAt: z.ZodString;
    /** Organisation-level commercial profile. Missing ⇒ International. */
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
export type UserDTO = z.infer<typeof UserDTO>;
export declare const LoginResponse: z.ZodObject<{
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
        /** Organisation-level commercial profile. Missing ⇒ International. */
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
    /** Refresh token is delivered via httpOnly cookie — never returned in body. */
    expiresInSec: z.ZodNumber;
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
}>;
export type LoginResponse = z.infer<typeof LoginResponse>;
/** Dashboard route for each role — single source of truth for redirects. */
export declare const ROLE_DASHBOARD: Record<Role, string>;
/** Roles with access to operations console routes (/operations/*). */
export declare const OPERATIONS_PLATFORM_ROLES: readonly ["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR", "FINANCE_OPERATOR", "DOCUMENT_CONTROLLER"];
/** Roles with full admin platform access (/admin/* destructive controls). */
export declare const ADMIN_PLATFORM_ROLES: readonly ["ADMIN", "SUPER_ADMIN"];
export declare const UpdateProfileInput: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    phoneNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    avatarUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    displayName?: string | undefined;
    avatarUrl?: string | null | undefined;
    phoneNumber?: string | null | undefined;
}, {
    displayName?: string | undefined;
    avatarUrl?: string | null | undefined;
    phoneNumber?: string | null | undefined;
}>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;
