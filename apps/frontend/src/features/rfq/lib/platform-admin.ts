import { ADMIN_PLATFORM_ROLES } from "@dmx/contracts/auth";

export function isPlatformAdmin(role?: string): boolean {
  return !!role && (ADMIN_PLATFORM_ROLES as readonly string[]).includes(role);
}

/** Map logged-in role to RFQ workspace actor role for FSM / next-actions. */
export function rfqWorkspaceActorRole(role?: string): "BUYER" | "SUPPLIER" | "ADMIN" {
  if (isPlatformAdmin(role)) return "ADMIN";
  if (role === "SUPPLIER") return "SUPPLIER";
  return "BUYER";
}
