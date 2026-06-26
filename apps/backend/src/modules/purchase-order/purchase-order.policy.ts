import type { PrismaClient } from "@prisma/client";
import type { PoAction } from "@dmx/contracts/purchase-order";
import { canAccessOrder, type AuthUser } from "../order/order.policy.js";

export type { AuthUser };

export async function canAccessPo(
  prisma: PrismaClient,
  user: AuthUser,
  poId: string,
): Promise<boolean> {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { orderId: true } });
  if (!po) return false;
  return canAccessOrder(prisma, user, po.orderId);
}

export function assertPoActionRole(action: PoAction, role: AuthUser["role"]): void {
  const rules: Record<PoAction, AuthUser["role"][]> = {
    issue_po: ["BUYER", "ADMIN"],
    acknowledge_po: ["SUPPLIER"],
    request_amendment: ["SUPPLIER", "BUYER"],
    approve_amendment: ["BUYER", "ADMIN"],
    reject_amendment: ["BUYER", "ADMIN"],
    close_po: ["BUYER", "ADMIN"],
    cancel_po: ["BUYER", "ADMIN"],
  };
  if (!rules[action].includes(role)) throw new Error("FORBIDDEN_ROLE");
}
