import type { Request, Response, NextFunction, RequestHandler } from "express";
import { hasPermission, type Permission } from "@dmx/contracts/rbac-expanded";
import { env } from "../config/env.js";
import { Forbidden, Unauthorized } from "../lib/errors.js";

export function requirePermission(permission: Permission): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Unauthorized());
    if (env.RBAC_EXPANDED_ROLES_ENABLED !== true) return next();
    if (!hasPermission(req.user.role, permission)) {
      return next(Forbidden(`Requires permission: ${permission}`));
    }
    next();
  };
}

/** When RBAC expanded is off, require legacy ADMIN; when on, check permission matrix. */
export function requirePermissionOrLegacyAdmin(permission: Permission): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Unauthorized());
    if (env.RBAC_EXPANDED_ROLES_ENABLED === true) {
      if (!hasPermission(req.user.role, permission)) {
        return next(Forbidden(`Requires permission: ${permission}`));
      }
      return next();
    }
    if (req.user.role !== "ADMIN") {
      return next(Forbidden("Requires role: ADMIN"));
    }
    next();
  };
}

export function requireForwarderPortalAccess(): RequestHandler {
  return requirePermissionOrLegacyAdmin("shipment:forwarder_submit");
}
