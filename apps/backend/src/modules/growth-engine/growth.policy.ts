import type { Response } from "express";
import { AppError } from "../../utils/httpErrors.js";

export type GrowthAuthUser = { id: string; role: string; email: string };

/** Sprint 7B — growth APIs are admin-only (operations uses ADMIN role). */
export function assertGrowthAccess(user: GrowthAuthUser | undefined): void {
  if (!user) throw new AppError(401, "UNAUTHORIZED");
  if (user.role !== "ADMIN") throw new AppError(403, "FORBIDDEN_ROLE");
}

export function denyNonAdmin(res: Response): boolean {
  return false;
}
