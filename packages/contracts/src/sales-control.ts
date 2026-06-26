import { z } from "zod";

export const ResetCustomerPasswordInput = z.object({
  newPassword: z.string().min(8).max(200).optional(),
});
export type ResetCustomerPasswordInput = z.infer<typeof ResetCustomerPasswordInput>;

export const CustomerAccountRole = z.enum(["BUYER", "SUPPLIER"]);
export type CustomerAccountRole = z.infer<typeof CustomerAccountRole>;

const SUPPLIER_CREATION_BLOCKLIST = new Set(["ilham@demaxtore.com"]);

export function canCreateSupplierCustomerAccount(actor: {
  email?: string | null;
  role?: string | null;
}): boolean {
  if (actor.role === "ADMIN") return true;
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
export type CreateCustomerAccountInput = z.infer<typeof CreateCustomerAccountInput>;

export const CustomerAccountDto = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: CustomerAccountRole,
  organisation: z.string(),
  createdAt: z.string().datetime(),
  createdByName: z.string().nullable().optional(),
});
export type CustomerAccountDto = z.infer<typeof CustomerAccountDto>;

export const CreateCustomerAccountResponse = z.object({
  account: CustomerAccountDto,
  loginUrl: z.string(),
});
export type CreateCustomerAccountResponse = z.infer<typeof CreateCustomerAccountResponse>;

export const ResetCustomerPasswordResponse = z.object({
  email: z.string().email(),
  passwordReset: z.literal(true),
});
export type ResetCustomerPasswordResponse = z.infer<typeof ResetCustomerPasswordResponse>;
