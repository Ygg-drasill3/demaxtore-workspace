import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  requirePermission,
  requirePermissionOrLegacyAdmin,
  requireForwarderPortalAccess,
} from "./require-permission.js";

vi.mock("../config/env.js", () => ({
  env: { RBAC_EXPANDED_ROLES_ENABLED: false },
}));

function runMiddleware(handler: (req: Request, res: Response, next: NextFunction) => void, user?: { role: string }) {
  const req = { user: user ? { id: "u1", email: "u@test", role: user.role } : undefined } as Request;
  const res = {} as Response;
  let error: unknown;
  const next = (err?: unknown) => { error = err; };
  handler(req, res, next);
  return error;
}

describe("requirePermission", () => {
  it("passes when RBAC flag off", () => {
    const err = runMiddleware(requirePermission("payment:manage") as never, { role: "BUYER" });
    expect(err).toBeUndefined();
  });

  it("enforces permission when RBAC on", async () => {
    const { env } = await import("../config/env.js");
    (env as { RBAC_EXPANDED_ROLES_ENABLED: boolean }).RBAC_EXPANDED_ROLES_ENABLED = true;

    expect(runMiddleware(requirePermission("payment:manage") as never, { role: "FINANCE_OPERATOR" })).toBeUndefined();
    expect(runMiddleware(requirePermission("payment:manage") as never, { role: "BUYER" })).toBeDefined();

    (env as { RBAC_EXPANDED_ROLES_ENABLED: boolean }).RBAC_EXPANDED_ROLES_ENABLED = false;
  });
});

describe("requirePermissionOrLegacyAdmin", () => {
  it("requires ADMIN when RBAC off", () => {
    expect(runMiddleware(requirePermissionOrLegacyAdmin("control_tower:admin") as never, { role: "ADMIN" })).toBeUndefined();
    expect(runMiddleware(requirePermissionOrLegacyAdmin("control_tower:admin") as never, { role: "BUYER" })).toBeDefined();
  });
});

describe("requireForwarderPortalAccess", () => {
  it("allows ADMIN when RBAC off", () => {
    expect(runMiddleware(requireForwarderPortalAccess() as never, { role: "ADMIN" })).toBeUndefined();
  });
});
