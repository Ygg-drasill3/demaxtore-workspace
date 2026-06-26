import type { Role } from "@prisma/client";
import type { ActorRole } from "@dmx/contracts/commoditybid.fsm";

/** Authenticated actor passed through services and policies. */
export type AuthUser = {
  id: string;
  email: string;
  role: Role | "SYSTEM";
};

/** Map Prisma role to FSM actor role (expanded roles are valid ActorRole values). */
export function toActorRole(role: Role | "SYSTEM"): ActorRole {
  return role as ActorRole;
}
