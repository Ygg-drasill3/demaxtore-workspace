import type { AuthUser } from "../freightiq.policy.js";
import { AppError } from "../../../utils/httpErrors.js";

export function assertAdminCommercial(actor: AuthUser) {
  if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN_ROLE");
}

export function canViewOfferCommercial(actor: AuthUser): boolean {
  return actor.role === "ADMIN";
}
