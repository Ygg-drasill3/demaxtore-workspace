import type { Role } from "@prisma/client";
import { REFERENCE_FREIGHT_ADMIN_ROLES } from "@dmx/contracts/reference-freight";

export const REFERENCE_FREIGHT_ALLOWED_ROLES: Role[] = [
  ...REFERENCE_FREIGHT_ADMIN_ROLES,
] as Role[];

export function canManageReferenceFreight(role: Role): boolean {
  return REFERENCE_FREIGHT_ALLOWED_ROLES.includes(role);
}
