// =============================================================================
// @dmx/contracts — Auth contracts
// =============================================================================
import { z } from "zod";
export const RoleEnum = z.enum(["BUYER", "SUPPLIER", "ADMIN", "SALES_CONTROL"]);
export const LoginInput = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(200),
});
export const ForgotPasswordInput = z.object({
    email: z.string().email(),
});
export const ResetPasswordInput = z.object({
    token: z.string().min(10).max(500),
    newPassword: z.string().min(8).max(200),
});
export const RegisterInput = z.object({
    displayName: z.string().trim().min(2).max(120),
    email: z.string().email().max(200),
    password: z.string().min(8).max(200),
    organisationName: z.string().trim().min(2).max(160),
});
export const UserDTO = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    role: RoleEnum,
    organisation: z.string().nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    createdAt: z.string().datetime(),
});
export const LoginResponse = z.object({
    user: UserDTO,
    accessToken: z.string(),
    /** Refresh token is delivered via httpOnly cookie — never returned in body. */
    expiresInSec: z.number().int().positive(),
});
/** Dashboard route for each role — single source of truth for redirects. */
export const ROLE_DASHBOARD = {
    BUYER: "/buyer/control-tower",
    SUPPLIER: "/supplier/dashboard",
    ADMIN: "/admin/dashboard",
    SALES_CONTROL: "/sales/dashboard",
};
//# sourceMappingURL=auth.js.map