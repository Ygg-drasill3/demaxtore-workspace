import { z } from "zod";
export const ResetCustomerPasswordInput = z.object({
    newPassword: z.string().min(8).max(200).optional(),
});
export const CustomerAccountRole = z.enum(["BUYER", "SUPPLIER"]);
const SUPPLIER_CREATION_BLOCKLIST = new Set(["ilham@demaxtore.com"]);
export function canCreateSupplierCustomerAccount(actor) {
    if (actor.role === "ADMIN")
        return true;
    const email = actor.email?.trim().toLowerCase();
    return email ? !SUPPLIER_CREATION_BLOCKLIST.has(email) : true;
}
export const CreateCustomerAccountInput = z.object({
    displayName: z.string().trim().min(2).max(120),
    email: z.string().email().max(200),
    password: z.string().min(8).max(200),
    role: CustomerAccountRole,
    organisationName: z.string().trim().min(2).max(160),
});
export const CustomerAccountDto = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    role: CustomerAccountRole,
    organisation: z.string(),
    createdAt: z.string().datetime(),
    createdByName: z.string().nullable().optional(),
});
export const CreateCustomerAccountResponse = z.object({
    account: CustomerAccountDto,
    loginUrl: z.string(),
});
export const ResetCustomerPasswordResponse = z.object({
    email: z.string().email(),
    passwordReset: z.literal(true),
});
//# sourceMappingURL=sales-control.js.map