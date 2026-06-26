// apps/frontend/src/features/auth/lib/auth.api.ts
import { api } from "@/lib/api";
import type { LoginResponse, ForgotPasswordInput, ResetPasswordInput, RegisterInput } from "@dmx/contracts/auth";

export type ForgotPasswordResponse = { ok: boolean; resetUrl?: string };

export const authApi = {
  forgotPassword: (input: ForgotPasswordInput) =>
    api.post<ForgotPasswordResponse>("/auth/forgot-password", input).then((r) => r.data),
  resetPassword:  (input: ResetPasswordInput)  => api.post("/auth/reset-password",  input).then(r => r.data),
  register:       (input: RegisterInput)       => api.post<LoginResponse>("/auth/register", input).then(r => r.data),
  me:             ()                            => api.get<LoginResponse>("/auth/me").then(r => r.data),
};
