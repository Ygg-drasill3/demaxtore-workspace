import { z } from "zod";
export declare const ResetCustomerPasswordInput: z.ZodObject<{
    newPassword: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    newPassword?: string | undefined;
}, {
    newPassword?: string | undefined;
}>;
export type ResetCustomerPasswordInput = z.infer<typeof ResetCustomerPasswordInput>;
export declare const CustomerAccountRole: z.ZodEnum<["BUYER", "SUPPLIER"]>;
export type CustomerAccountRole = z.infer<typeof CustomerAccountRole>;
export declare function canCreateSupplierCustomerAccount(actor: {
    email?: string | null;
    role?: string | null;
}): boolean;
export declare const CreateCustomerAccountInput: z.ZodObject<{
    displayName: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodEnum<["BUYER", "SUPPLIER"]>;
    organisationName: z.ZodString;
    whatsappPhone: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>, string | undefined, string | undefined>;
    /** Legacy WhatsApp-only notify (no login). Prefer additionalMembers for real accounts. */
    secondaryContactName: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>, string | undefined, string | undefined>;
    secondaryContactEmail: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>, string | undefined, string | undefined>;
    secondaryContactWhatsapp: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>, string | undefined, string | undefined>;
    /**
     * Extra login users under the same organisation (max 2 → 3 people total with primary).
     * Each gets a real SUPPLIER/BUYER account sharing organisationId.
     */
    additionalMembers: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        displayName: z.ZodString;
        email: z.ZodString;
        password: z.ZodOptional<z.ZodString>;
        whatsappPhone: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>, string | undefined, string | undefined>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        displayName: string;
        password?: string | undefined;
        whatsappPhone?: string | undefined;
    }, {
        email: string;
        displayName: string;
        password?: string | undefined;
        whatsappPhone?: string | undefined;
    }>, "many">>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    displayName: string;
    organisationName: string;
    role: "BUYER" | "SUPPLIER";
    additionalMembers: {
        email: string;
        displayName: string;
        password?: string | undefined;
        whatsappPhone?: string | undefined;
    }[];
    whatsappPhone?: string | undefined;
    secondaryContactName?: string | undefined;
    secondaryContactEmail?: string | undefined;
    secondaryContactWhatsapp?: string | undefined;
}, {
    email: string;
    password: string;
    displayName: string;
    organisationName: string;
    role: "BUYER" | "SUPPLIER";
    whatsappPhone?: string | undefined;
    secondaryContactName?: string | undefined;
    secondaryContactEmail?: string | undefined;
    secondaryContactWhatsapp?: string | undefined;
    additionalMembers?: {
        email: string;
        displayName: string;
        password?: string | undefined;
        whatsappPhone?: string | undefined;
    }[] | undefined;
}>;
export type CreateCustomerAccountInput = z.infer<typeof CreateCustomerAccountInput>;
export declare const SetSupplierCatalogLinkInput: z.ZodObject<{
    url: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>, string | null, string>;
}, "strip", z.ZodTypeAny, {
    url: string | null;
}, {
    url: string;
}>;
export type SetSupplierCatalogLinkInput = z.infer<typeof SetSupplierCatalogLinkInput>;
export declare const CustomerAccountDto: z.ZodObject<{
    id: z.ZodString;
    organisationId: z.ZodNullable<z.ZodString>;
    email: z.ZodString;
    displayName: z.ZodString;
    role: z.ZodEnum<["BUYER", "SUPPLIER"]>;
    organisation: z.ZodString;
    /** Free-text interest / product category labels from the organisation. */
    interestAreas: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    whatsappPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phoneNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phoneVerificationStatus: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    logoUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    catalogUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** True when catalogUrl is an external https link (not uploaded PDF). */
    catalogIsExternal: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodString;
    createdByName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    displayName: string;
    id: string;
    role: "BUYER" | "SUPPLIER";
    organisation: string;
    createdAt: string;
    organisationId: string | null;
    interestAreas: string[];
    phoneNumber?: string | null | undefined;
    phoneVerificationStatus?: string | null | undefined;
    whatsappPhone?: string | null | undefined;
    logoUrl?: string | null | undefined;
    catalogUrl?: string | null | undefined;
    catalogIsExternal?: boolean | undefined;
    createdByName?: string | null | undefined;
}, {
    email: string;
    displayName: string;
    id: string;
    role: "BUYER" | "SUPPLIER";
    organisation: string;
    createdAt: string;
    organisationId: string | null;
    phoneNumber?: string | null | undefined;
    phoneVerificationStatus?: string | null | undefined;
    whatsappPhone?: string | null | undefined;
    interestAreas?: string[] | undefined;
    logoUrl?: string | null | undefined;
    catalogUrl?: string | null | undefined;
    catalogIsExternal?: boolean | undefined;
    createdByName?: string | null | undefined;
}>;
export type CustomerAccountDto = z.infer<typeof CustomerAccountDto>;
export declare const CustomerAccountDetailDto: z.ZodObject<{
    id: z.ZodString;
    organisationId: z.ZodNullable<z.ZodString>;
    email: z.ZodString;
    displayName: z.ZodString;
    role: z.ZodEnum<["BUYER", "SUPPLIER"]>;
    organisation: z.ZodString;
    /** Free-text interest / product category labels from the organisation. */
    interestAreas: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    whatsappPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phoneNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phoneVerificationStatus: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    logoUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    catalogUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** True when catalogUrl is an external https link (not uploaded PDF). */
    catalogIsExternal: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodString;
    createdByName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
} & {
    /** Other login users under the same organisation (excluding this account). */
    teammates: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        organisationId: z.ZodNullable<z.ZodString>;
        email: z.ZodString;
        displayName: z.ZodString;
        role: z.ZodEnum<["BUYER", "SUPPLIER"]>;
        organisation: z.ZodString;
        /** Free-text interest / product category labels from the organisation. */
        interestAreas: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        whatsappPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phoneNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phoneVerificationStatus: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        logoUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        catalogUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        /** True when catalogUrl is an external https link (not uploaded PDF). */
        catalogIsExternal: z.ZodOptional<z.ZodBoolean>;
        createdAt: z.ZodString;
        createdByName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER";
        organisation: string;
        createdAt: string;
        organisationId: string | null;
        interestAreas: string[];
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: string | null | undefined;
        whatsappPhone?: string | null | undefined;
        logoUrl?: string | null | undefined;
        catalogUrl?: string | null | undefined;
        catalogIsExternal?: boolean | undefined;
        createdByName?: string | null | undefined;
    }, {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER";
        organisation: string;
        createdAt: string;
        organisationId: string | null;
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: string | null | undefined;
        whatsappPhone?: string | null | undefined;
        interestAreas?: string[] | undefined;
        logoUrl?: string | null | undefined;
        catalogUrl?: string | null | undefined;
        catalogIsExternal?: boolean | undefined;
        createdByName?: string | null | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    email: string;
    displayName: string;
    id: string;
    role: "BUYER" | "SUPPLIER";
    organisation: string;
    createdAt: string;
    organisationId: string | null;
    interestAreas: string[];
    teammates: {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER";
        organisation: string;
        createdAt: string;
        organisationId: string | null;
        interestAreas: string[];
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: string | null | undefined;
        whatsappPhone?: string | null | undefined;
        logoUrl?: string | null | undefined;
        catalogUrl?: string | null | undefined;
        catalogIsExternal?: boolean | undefined;
        createdByName?: string | null | undefined;
    }[];
    phoneNumber?: string | null | undefined;
    phoneVerificationStatus?: string | null | undefined;
    whatsappPhone?: string | null | undefined;
    logoUrl?: string | null | undefined;
    catalogUrl?: string | null | undefined;
    catalogIsExternal?: boolean | undefined;
    createdByName?: string | null | undefined;
}, {
    email: string;
    displayName: string;
    id: string;
    role: "BUYER" | "SUPPLIER";
    organisation: string;
    createdAt: string;
    organisationId: string | null;
    phoneNumber?: string | null | undefined;
    phoneVerificationStatus?: string | null | undefined;
    whatsappPhone?: string | null | undefined;
    interestAreas?: string[] | undefined;
    logoUrl?: string | null | undefined;
    catalogUrl?: string | null | undefined;
    catalogIsExternal?: boolean | undefined;
    createdByName?: string | null | undefined;
    teammates?: {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER";
        organisation: string;
        createdAt: string;
        organisationId: string | null;
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: string | null | undefined;
        whatsappPhone?: string | null | undefined;
        interestAreas?: string[] | undefined;
        logoUrl?: string | null | undefined;
        catalogUrl?: string | null | undefined;
        catalogIsExternal?: boolean | undefined;
        createdByName?: string | null | undefined;
    }[] | undefined;
}>;
export type CustomerAccountDetailDto = z.infer<typeof CustomerAccountDetailDto>;
export declare const UpdateCustomerAccountInput: z.ZodObject<{
    displayName: z.ZodString;
    email: z.ZodString;
    organisationName: z.ZodString;
    whatsappPhone: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>, string | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    email: string;
    displayName: string;
    organisationName: string;
    whatsappPhone?: string | undefined;
}, {
    email: string;
    displayName: string;
    organisationName: string;
    whatsappPhone?: string | undefined;
}>;
export type UpdateCustomerAccountInput = z.infer<typeof UpdateCustomerAccountInput>;
export declare const CreateCustomerAccountResponse: z.ZodObject<{
    account: z.ZodObject<{
        id: z.ZodString;
        organisationId: z.ZodNullable<z.ZodString>;
        email: z.ZodString;
        displayName: z.ZodString;
        role: z.ZodEnum<["BUYER", "SUPPLIER"]>;
        organisation: z.ZodString;
        /** Free-text interest / product category labels from the organisation. */
        interestAreas: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        whatsappPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phoneNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phoneVerificationStatus: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        logoUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        catalogUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        /** True when catalogUrl is an external https link (not uploaded PDF). */
        catalogIsExternal: z.ZodOptional<z.ZodBoolean>;
        createdAt: z.ZodString;
        createdByName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER";
        organisation: string;
        createdAt: string;
        organisationId: string | null;
        interestAreas: string[];
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: string | null | undefined;
        whatsappPhone?: string | null | undefined;
        logoUrl?: string | null | undefined;
        catalogUrl?: string | null | undefined;
        catalogIsExternal?: boolean | undefined;
        createdByName?: string | null | undefined;
    }, {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER";
        organisation: string;
        createdAt: string;
        organisationId: string | null;
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: string | null | undefined;
        whatsappPhone?: string | null | undefined;
        interestAreas?: string[] | undefined;
        logoUrl?: string | null | undefined;
        catalogUrl?: string | null | undefined;
        catalogIsExternal?: boolean | undefined;
        createdByName?: string | null | undefined;
    }>;
    loginUrl: z.ZodString;
    /** All created login credentials (primary first, then additional members). */
    members: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
        displayName: string;
        id: string;
    }, {
        email: string;
        password: string;
        displayName: string;
        id: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    account: {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER";
        organisation: string;
        createdAt: string;
        organisationId: string | null;
        interestAreas: string[];
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: string | null | undefined;
        whatsappPhone?: string | null | undefined;
        logoUrl?: string | null | undefined;
        catalogUrl?: string | null | undefined;
        catalogIsExternal?: boolean | undefined;
        createdByName?: string | null | undefined;
    };
    loginUrl: string;
    members?: {
        email: string;
        password: string;
        displayName: string;
        id: string;
    }[] | undefined;
}, {
    account: {
        email: string;
        displayName: string;
        id: string;
        role: "BUYER" | "SUPPLIER";
        organisation: string;
        createdAt: string;
        organisationId: string | null;
        phoneNumber?: string | null | undefined;
        phoneVerificationStatus?: string | null | undefined;
        whatsappPhone?: string | null | undefined;
        interestAreas?: string[] | undefined;
        logoUrl?: string | null | undefined;
        catalogUrl?: string | null | undefined;
        catalogIsExternal?: boolean | undefined;
        createdByName?: string | null | undefined;
    };
    loginUrl: string;
    members?: {
        email: string;
        password: string;
        displayName: string;
        id: string;
    }[] | undefined;
}>;
export type CreateCustomerAccountResponse = z.infer<typeof CreateCustomerAccountResponse>;
export declare const ResetCustomerPasswordResponse: z.ZodObject<{
    email: z.ZodString;
    passwordReset: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    email: string;
    passwordReset: true;
}, {
    email: string;
    passwordReset: true;
}>;
export type ResetCustomerPasswordResponse = z.infer<typeof ResetCustomerPasswordResponse>;
