import type { PrismaClient } from "@prisma/client";
import { FREIGHTIQ_ORDER_ELIGIBLE_STATES } from "@dmx/contracts/freightiq";
import type { FreightAction } from "@dmx/contracts/freightiq";
import { canAccessOrder, type AuthUser } from "../order/order.policy.js";

export { type AuthUser };

export async function canAccessFreightForOrder(
  prisma: PrismaClient,
  user: AuthUser,
  orderId: string,
): Promise<boolean> {
  return canAccessOrder(prisma, user, orderId);
}

export function assertFreightActionRole(action: FreightAction, role: AuthUser["role"]): void {
  const rules: Record<FreightAction, AuthUser["role"][]> = {
    create_request: ["BUYER", "ADMIN"],
    submit_offer: ["ADMIN", "SUPPLIER"],
    revise_offer: ["ADMIN", "SUPPLIER"],
    withdraw_offer: ["ADMIN", "SUPPLIER"],
    select_offer: ["BUYER", "ADMIN"],
    cancel_request: ["BUYER", "ADMIN"],
  };
  if (!rules[action].includes(role)) {
    throw new Error("FORBIDDEN_ROLE");
  }
}

export function isOrderEligibleForFreight(state: string, actorRole?: AuthUser["role"]): boolean {
  if (state === "CLOSED" || state === "CANCELLED" || state === "DISPUTED" || state === "REJECTED") return false;
  if (actorRole === "ADMIN") return true;
  return (FREIGHTIQ_ORDER_ELIGIBLE_STATES as readonly string[]).includes(state);
}
