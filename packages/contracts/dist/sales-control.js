import { z } from "zod";
export const ResetCustomerPasswordInput = z.object({
    newPassword: z.string().min(8).max(200).optional(),
});
export const CustomerAccountRole = z.enum(["BUYER", "SUPPLIER"]);
export function canCreateSupplierCustomerAccount(actor) {
    if (actor.role === "ADMIN")
        return true;
    return true;
}
const optionalPhone = z
    .union([z.string().trim().min(8).max(32), z.literal("")])
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined));
const optionalEmail = z
    .union([z.string().email().max(200), z.literal("")])
    .optional()
    .transform((v) => (v?.trim() ? v.trim().toLowerCase() : undefined));
const optionalName = z
    .union([z.string().trim().min(2).max(120), z.literal("")])
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined));
export const CreateCustomerAccountInput = z.object({
    displayName: z.string().trim().min(2).max(120),
    email: z.string().email().max(200),
    password: z.string().min(8).max(200),
    role: CustomerAccountRole,
    organisationName: z.string().trim().min(2).max(160),
    whatsappPhone: optionalPhone,
    /** Legacy WhatsApp-only notify (no login). Prefer additionalMembers for real accounts. */
    secondaryContactName: optionalName,
    secondaryContactEmail: optionalEmail,
    secondaryContactWhatsapp: optionalPhone,
    /**
     * Extra login users under the same organisation (max 2 → 3 people total with primary).
     * Each gets a real SUPPLIER/BUYER account sharing organisationId.
     */
    additionalMembers: z
        .array(z.object({
        displayName: z.string().trim().min(2).max(120),
        email: z.string().email().max(200),
        password: z.string().min(8).max(200).optional(),
        whatsappPhone: optionalPhone,
    }))
        .max(2)
        .optional()
        .default([]),
});
export const SetSupplierCatalogLinkInput = z.object({
    url: z
        .union([z.string().url().max(2000), z.literal("")])
        .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null)),
});
export const CustomerAccountDto = z.object({
    id: z.string().uuid(),
    organisationId: z.string().uuid().nullable(),
    email: z.string().email(),
    displayName: z.string(),
    role: CustomerAccountRole,
    organisation: z.string(),
    /** Free-text interest / product category labels from the organisation. */
    interestAreas: z.array(z.string()).default([]),
    whatsappPhone: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    phoneVerificationStatus: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    catalogUrl: z.string().nullable().optional(),
    /** True when catalogUrl is an external https link (not uploaded PDF). */
    catalogIsExternal: z.boolean().optional(),
    createdAt: z.string().datetime(),
    createdByName: z.string().nullable().optional(),
});
export const CustomerAccountDetailDto = CustomerAccountDto.extend({
    /** Other login users under the same organisation (excluding this account). */
    teammates: z.array(CustomerAccountDto).default([]),
});
export const UpdateCustomerAccountInput = z.object({
    displayName: z.string().trim().min(2).max(120),
    email: z.string().email().max(200),
    organisationName: z.string().trim().min(2).max(160),
    whatsappPhone: optionalPhone,
});
export const CreateCustomerAccountResponse = z.object({
    account: CustomerAccountDto,
    loginUrl: z.string(),
    /** All created login credentials (primary first, then additional members). */
    members: z
        .array(z.object({
        id: z.string().uuid(),
        displayName: z.string(),
        email: z.string().email(),
        password: z.string(),
    }))
        .optional(),
});
export const ResetCustomerPasswordResponse = z.object({
    email: z.string().email(),
    passwordReset: z.literal(true),
});
