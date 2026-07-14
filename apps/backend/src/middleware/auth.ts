// apps/backend/src/middleware/auth.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { Role } from "@prisma/client";
import { verifyAccessToken, type PasswordlessScopeClaim } from "../modules/auth/jwt.js";
import { Forbidden, Unauthorized } from "../lib/errors.js";
import { isPasswordlessAllowedPath } from "../modules/passwordless-access/passwordless-access.policy.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; email: string; role: Role };
    accessMode?: "passwordless" | "full";
    passwordlessScope?: PasswordlessScopeClaim;
  }
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearer(req);
  if (!token) return next(Unauthorized("Missing bearer token"));
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    req.accessMode = payload.accessMode ?? "full";
    req.passwordlessScope = payload.pwa;

    if (req.accessMode === "passwordless" && !isPasswordlessAllowedPath(req)) {
      return next(Forbidden("Passwordless access is limited to workspace conversation"));
    }
    next();
  } catch {
    next(Unauthorized("Invalid or expired access token"));
  }
};

export const requireFullAccess: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  if (req.accessMode === "passwordless") {
    return next(Forbidden("Full workspace authentication required"));
  }
  next();
};

export const requireRole =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(Unauthorized());
    if (!allowed.includes(req.user.role)) return next(Forbidden(`Requires role: ${allowed.join("|")}`));
    next();
  };
