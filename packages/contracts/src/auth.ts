// =============================================================================
// @dmx/contracts — Auth contracts
// =============================================================================
import { z } from "zod";
import { BuyerOperatingModelEnum } from "./buyer-operating-model.js";

export type Role =
  | "BUYER"
  | "SUPPLIER"
  | "ADMIN"
  | "SALES_CONTROL"
  | "SUPER_ADMIN"
  | "OPS_MANAGER"
  | "LOGISTICS_OPERATOR"
  | "FINANCE_OPERATOR"
  | "DOCUMENT_CONTROLLER"
  | "FORWARDER"
  | "ORIGIN_AGENT"
  | "TRUCKER"
  | "CUSTOMS_BROKER";

export const RoleEnum = z.enum([
  "BUYER",
  "SUPPLIER",
  "ADMIN",
  "SALES_CONTROL",
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "LOGISTICS_OPERATOR",
  "FINANCE_OPERATOR",
  "DOCUMENT_CONTROLLER",
  "FORWARDER",
  "ORIGIN_AGENT",
  "TRUCKER",
  "CUSTOMS_BROKER",
]);

export const LoginInput = z.object({
  email:    z.string().email(),
  password: z.string().min(8).max(200),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const ForgotPasswordInput = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInput>;

export const ResetPasswordInput = z.object({
  token:       z.string().min(10).max(500),
  newPassword: z.string().min(8).max(200),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;

export const RegisterInput = z.object({
  displayName:      z.string().trim().min(2).max(120),
  email:            z.string().email().max(200),
  password:         z.string().min(8).max(200),
  organisationName: z.string().trim().min(2).max(160),
  phone:            z.string().trim().min(8).max(20),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const UserDTO = z.object({
  id:           z.string().uuid(),
  email:        z.string().email(),
  displayName:  z.string(),
  role:         RoleEnum,
  organisation: z.string().nullable().optional(),
  avatarUrl:    z.string().url().nullable().optional(),
  phoneNumber:  z.string().nullable().optional(),
  phoneVerificationStatus: z
    .enum(["PENDING_PHONE_VERIFICATION", "PHONE_VERIFIED", "PHONE_REJECTED"])
    .nullable()
    .optional(),
  createdAt:    z.string().datetime(),
  /** Organisation-level commercial profile. Missing ⇒ International. */
  buyerOperatingModel: BuyerOperatingModelEnum.optional(),
});
export type UserDTO = z.infer<typeof UserDTO>;

export const LoginResponse = z.object({
  user:         UserDTO,
  accessToken:  z.string(),
  /** Refresh token is delivered via httpOnly cookie — never returned in body. */
  expiresInSec: z.number().int().positive(),
});
export type LoginResponse = z.infer<typeof LoginResponse>;

/** Dashboard route for each role — single source of truth for redirects. */
export const ROLE_DASHBOARD: Record<Role, string> = {
  BUYER:              "/buyer/inbox",
  SUPPLIER:           "/supplier/dashboard",
  ADMIN:              "/admin/dashboard",
  SALES_CONTROL:      "/sales/dashboard",
  SUPER_ADMIN:        "/admin/dashboard",
  OPS_MANAGER:        "/operations",
  LOGISTICS_OPERATOR: "/operations/freight",
  FINANCE_OPERATOR:   "/operations",
  DOCUMENT_CONTROLLER:"/admin/dashboard",
  FORWARDER:          "/forwarder/dashboard",
  ORIGIN_AGENT:       "/partner",
  TRUCKER:            "/partner",
  CUSTOMS_BROKER:     "/partner",
};

/** Roles with access to operations console routes (/operations/*). */
export const OPERATIONS_PLATFORM_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "LOGISTICS_OPERATOR",
  "FINANCE_OPERATOR",
  "DOCUMENT_CONTROLLER",
] as const satisfies readonly Role[];

/** Roles with full admin platform access (/admin/* destructive controls). */
export const ADMIN_PLATFORM_ROLES = ["ADMIN", "SUPER_ADMIN"] as const satisfies readonly Role[];


export const UpdateProfileInput = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  phoneNumber: z.string().trim().min(8).max(20).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;
