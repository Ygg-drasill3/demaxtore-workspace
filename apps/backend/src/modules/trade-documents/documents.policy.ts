import type { PrismaClient } from "@prisma/client";
import type { TradeDocumentAction } from "@dmx/contracts/trade-documents";
import { canAccessOrder, type AuthUser } from "../order/order.policy.js";
import { canAccessShipment } from "../shipment/shipment.policy.js";
import type { TradeWorkspaceType } from "@dmx/contracts/trade-documents";

export type { AuthUser };

export async function canAccessTradeWorkspace(
  prisma: PrismaClient,
  user: AuthUser,
  workspaceType: TradeWorkspaceType,
  workspaceId: string,
): Promise<boolean> {
  return workspaceType === "ORDER"
    ? await canAccessOrder(prisma, user, workspaceId)
    : await canAccessShipment(prisma, user, workspaceId);
}

export function assertDocumentActionRole(action: TradeDocumentAction, role: AuthUser["role"]): void {
  const rules: Record<TradeDocumentAction, AuthUser["role"][]> = {
    request_document: ["ADMIN", "BUYER"],
    upload_document: ["ADMIN", "SUPPLIER", "BUYER"],
    review_document: ["ADMIN"],
    approve_document: ["ADMIN", "BUYER"],
    reject_document: ["ADMIN", "BUYER"],
    expire_document: ["ADMIN"],
  };
  if (!rules[action].includes(role)) throw new Error("FORBIDDEN_ROLE");
}
