// apps/backend/src/modules/auth/auth.controller.ts
import type { Request, Response } from "express";
import { LoginInput, ForgotPasswordInput, ResetPasswordInput, RegisterInput } from "@dmx/contracts";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import * as authService from "./auth.service.js";
import {
  GOOGLE_STATE_COOKIE,
  buildGoogleAuthUrl,
  completeGoogleOAuth,
  isGoogleAuthEnabled,
  newGoogleOAuthState,
} from "./google-oauth.js";
import { env, isProd } from "../../config/env.js";
import { Unauthorized } from "../../lib/errors.js";

const REFRESH_COOKIE = "dmx_refresh";

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure:   isProd,
    path:     "/api/auth",
    maxAge:   env.REFRESH_TOKEN_TTL_SEC * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
}

function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export const loginValidator = validateBody(LoginInput);
export const registerValidator = validateBody(RegisterInput);
export const forgotValidator = validateBody(ForgotPasswordInput);
export const resetValidator = validateBody(ResetPasswordInput);

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await authService.login(email, password, clientIp(req));
  setRefreshCookie(res, result.refreshToken);
  res.json({
    user:         result.user,
    accessToken:  result.accessToken,
    expiresInSec: result.expiresInSec,
  });
});

export const register = asyncHandler(async (req, res) => {
  const body = req.body as RegisterInput;
  const result = await authService.register(body, clientIp(req));
  setRefreshCookie(res, result.refreshToken);
  res.status(201).json({
    user:         result.user,
    accessToken:  result.accessToken,
    expiresInSec: result.expiresInSec,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const raw = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  if (!raw) throw Unauthorized("Missing refresh token");
  const tokens = await authService.refresh(raw);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ accessToken: tokens.accessToken, expiresInSec: tokens.expiresInSec });
});

export const logout = asyncHandler(async (req, res) => {
  const raw = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  await authService.logout(raw);
  clearRefreshCookie(res);
  res.json({ ok: true });
});

export const me = [
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user!.id);
    res.json(user);
  }),
];

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body as { email: string };
  const resetUrl = await authService.forgotPassword(email);
  res.json({ ok: true, ...(resetUrl ? { resetUrl } : {}) });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  await authService.resetPassword(token, newPassword);
  res.json({ ok: true });
});

function loginPageUrl(query = ""): string {
  const base = `${env.APP_BASE_URL.replace(/\/$/, "")}/login/`;
  return query ? `${base}?${query}` : base;
}

export const googleStatus = asyncHandler(async (_req, res) => {
  res.json({ enabled: isGoogleAuthEnabled() });
});

export const googleStart = asyncHandler(async (req, res) => {
  if (!isGoogleAuthEnabled()) {
    res.redirect(loginPageUrl("error=google_not_configured"));
    return;
  }

  const state = newGoogleOAuthState();
  res.cookie(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/api/auth",
    maxAge: 10 * 60 * 1000,
  });

  const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : null;
  if (returnTo?.startsWith("/")) {
    res.cookie("dmx_oauth_return", returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/api/auth",
      maxAge: 10 * 60 * 1000,
    });
  }

  res.redirect(buildGoogleAuthUrl(state));
});

export const googleCallback = asyncHandler(async (req, res) => {
  const oauthError = typeof req.query.error === "string" ? req.query.error : null;
  if (oauthError) {
    res.redirect(loginPageUrl("error=google_auth_cancelled"));
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const savedState = (req.cookies as Record<string, string> | undefined)?.[GOOGLE_STATE_COOKIE];

  res.clearCookie(GOOGLE_STATE_COOKIE, { path: "/api/auth" });

  if (!code || !state || !savedState || state !== savedState) {
    res.redirect(loginPageUrl("error=google_auth_failed"));
    return;
  }

  try {
    const result = await completeGoogleOAuth(code);
    setRefreshCookie(res, result.refreshToken);
    res.clearCookie("dmx_oauth_return", { path: "/api/auth" });
    res.redirect(`${env.APP_BASE_URL.replace(/\/$/, "")}/login/oauth-callback`);
  } catch {
    res.redirect(loginPageUrl("error=google_auth_failed"));
  }
});
